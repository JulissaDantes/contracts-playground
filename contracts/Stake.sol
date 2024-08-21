// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Checkpoints.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Stake is Ownable, ReentrancyGuard {
    using Checkpoints for Checkpoints.History;
    using SafeERC20 for IERC20;

    event Deposit(address indexed depositor, uint256 amount);
    event Allocate(address indexed allocator, uint256 activityId, uint256 amount);
    event Delegate(address indexed delegator, address indexed delegate, uint256 amount);
    event Unallocate(address indexed unallocator, uint256 activityId, uint256 amount);
    event ClaimUnallocatedTokens(address indexed unallocator, uint256 activityId, uint256 amount);
    event Undelegate(address indexed delegator, address indexed delegate, uint256 amount);
    event ClaimUndelegatedTokens(address indexed delegator,  uint256 amount);
    event Slash(uint256 activityId, uint256 slashedAmount);
    event Reward(uint256 activityId, uint256 reward);
    event ClaimReward(address indexed depositor, uint256 activityId, uint256 reward);
    event Withdraw(address indexed depositor, uint256 amount);

    struct Delegation {
        uint256 amount;
        bool active;
    }

    struct Activity {
        uint256 balance;
        mapping(address => Checkpoints.History) depositorStake;
        address[] depositors;
        mapping(address => uint256) depositorIndex;
        mapping(address => uint256) depositorReward;
    }

    IERC20 public immutable token;
    uint8 public constant maxDepositors = 100;
    address public immutable treasury;
    uint256 public immutable undelegateDelay;
    uint256 public immutable unallocateDelay;
    uint256 public immutable minTimeToReward;
    mapping(address => uint256) public depositorBalance;
    //delegate -> delegator -> Delegation details
    mapping(address => mapping(address => Delegation)) public delegations;
    //delegate -> delegator -> activity -> stake 
    mapping(address => mapping(address => mapping(uint256 => uint256))) public delegateStake;
    mapping(uint256 => Activity) public activities;
    mapping(address => Checkpoints.History) private undelegationRequests;
    mapping(address => mapping(uint256 => Checkpoints.History)) private unallocationRequests;

    constructor(
        address _token,
        address _treasury,
        uint256 _undelegateDelay,
        uint256 _unallocateDelay,
        uint256 _minTimeToReward
    ) {
        require(_treasury != address(0), "Invalid treasury");
        token = IERC20(_token);
        treasury = _treasury;
        undelegateDelay = _undelegateDelay;
        unallocateDelay = _unallocateDelay;
        minTimeToReward = _minTimeToReward;
    }
    /*
     * Allows the user to deposit tokens into the staking contract, if the transfer of the tokens is successful 
     * it gets added to the address balance, and such address will now be recognized as a `depositor`.
     *
     * Requirements:
     *
     * - sender must have enough tokens to perform the transfer.
     *
     * Emits a `Deposit` event.
     */
    function deposit(uint256 amount) external {
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        token.safeTransferFrom(msg.sender, address(this), amount);

        depositorBalance[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /*
     * Allows a depositor to delegate an amount of their tokens to a different address, in order for
     * the delegate to be able to allocate tokens into activities as it if were the delegator.
     *
     * Requirements:
     *
     * - sender must have enough tokens deposited to perform the delegation.
     *
     * Emits a `Delegate` event.
     */
    function delegate(uint256 amount, address to) external {
        require(
            depositorBalance[msg.sender] > 0,
            "Only a depositor can call this function"
        );
        require(depositorBalance[msg.sender] >= amount, "Insufficient funds");
        delegations[to][msg.sender].amount += amount;
        delegations[to][msg.sender].active = true;
        depositorBalance[msg.sender] -= amount;
        emit Delegate(msg.sender, to, amount);
    }

    /*
     * Allows a delegator to create the request to remove some delegated tokens or all, to reduce or inactivate the delegation. There is
     * an already predetermined delay period in order for the delegator to claim the undelegated tokens, and the `requestTime` inside the request
     * will save the timestamp where it's ready to be claimed.
     *
     * Requirements:
     *
     * - `to` must be a delegate of the sender, and the delegation must be active.
     *
     * Emits a `Undelegate` event.
     */
    function undelegate(uint256 amount, address to) external {
        require(
            (delegations[to][msg.sender].amount >= amount || amount == 0) && delegations[to][msg.sender].active,
            "Invalid undelegation parameters"
        );
        delegations[to][msg.sender].amount -= amount;
        if (delegations[to][msg.sender].amount == 0) {
            delegations[to][msg.sender].active = false;
        } 
        
        undelegationRequests[msg.sender].push(_add, amount);
        

        emit Undelegate(msg.sender, to, amount);
    }

    /*
     * Transfer the undelegated token to the caller's balance.
     *
     * Requirements:
     *
     * - The delay period of the undelegated tokens must be over for the sender to claim the tokens.
     *
     * Emits a `ClaimUndelegatedTokens` event.
     */
    function claimUndelegatedTokens() external {
        uint256 blockNumber = block.number - undelegateDelay;
        uint256 total = undelegationRequests[msg.sender].getAtProbablyRecentBlock(blockNumber);
        require(total > 0, "Funds not yet available");
        depositorBalance[msg.sender] += total;
        undelegationRequests[msg.sender].push(_subtract, total);

        emit ClaimUndelegatedTokens(msg.sender, total);
    }

    /*
     * Stakes tokens into an activity.
     *
     * Requirements:
     *
     * - `from` must have enough balance to stake if caller is a depositor.
     * - sender must have enough delegated tokens from `from` to stake.
     * - `activityId` must be greater than zero to be valid.
     *
     * Emits a `Allocate` event.
     */
    function allocate(uint256 amount, uint256 activityId, address from) external {
        require(activities[activityId].depositors.length <= maxDepositors, "Max amount of depositors reached");
        bool isDelegator = delegations[msg.sender][from].amount >= amount;
        require(
            (depositorBalance[from] >= amount && from == msg.sender) || isDelegator,
            "Insufficient funds"
        );
        if (from == msg.sender) {
            depositorBalance[msg.sender] -= amount;
        } else {
            delegations[msg.sender][from].amount -= amount;
        }

        activities[activityId].balance += amount;

        if (activities[activityId].depositorStake[from].latest() == 0) {
            activities[activityId].depositors.push(from);
            activities[activityId].depositorIndex[from] = activities[activityId].depositors.length - 1;
        }
        activities[activityId].depositorStake[from].push(_add, amount);

        if (isDelegator) {
            delegateStake[msg.sender][from][activityId] += amount;
        }
        emit Allocate(msg.sender, activityId, amount);
    }

    /*
     * Removes the tokens allocation from an activity with a predetermined delay, to be claimed by the depositor.
     *
     * Requirements:
     *
     * - `from` must have enough staked tokens in the `activityId` if caller is a depositor.
     * - sender must have an active delegation from `from`.
     *
     * Emits a `Unallocate` event.
     */
    function unallocate(uint256 amount, uint256 activityId, address from) external {
        bool isDelegator = delegations[msg.sender][from].active;
        require(
            msg.sender == from || isDelegator,
            "Only depositor or a delegate can perform this operation"
        );

        if (isDelegator) {
            uint256 staked = delegateStake[msg.sender][from][activityId];
            require( staked > amount, "Not enough delegated tokens were staked");
            delegateStake[msg.sender][from][activityId] = staked - amount;
        }
        require(activities[activityId].depositorStake[from].latest() >= amount, "Not enough staked tokens");

        unallocationRequests[from][activityId].push(_add, amount);

        emit Unallocate(msg.sender, activityId, amount);
    }

    /*
     * This function enables the depositors to claim unallocated tokens from a specific activityId. 
     *
     * NOTE: if the activity was previously slashed, any tokens that were waiting to be claimed 
     * are subject to being slashed as well. As a result, the amount of tokens claimed may be less 
     * than the originally staked amount.
     *
     * Requirements:
     *
     * - The delay period of the unallocated tokens must be over for the sender to claim the tokens.
     *
     * Emits a `ClaimUnallocatedTokens` event.
     */
    function claimUnallocatedTokens(uint256 activityId) external {
        uint256 blockNumber = block.number - unallocateDelay;
        uint256 total = unallocationRequests[msg.sender][activityId].getAtProbablyRecentBlock(blockNumber);
        require(total > 0, "Funds not yet available");
        // check if slashed for the total amount
        uint256 totalStake = activities[activityId].depositorStake[msg.sender].latest();
        if (totalStake < total) {
            total = totalStake;
        } 
        
        activities[activityId].balance -= total;
        activities[activityId].depositorStake[msg.sender].push(_subtract, total);

        unallocationRequests[msg.sender][activityId].push(_subtract, total);
        if (unallocationRequests[msg.sender][activityId].latest() == 0) {
            removeDepositor(activities[activityId], activities[activityId].depositorIndex[msg.sender]);
        }
        depositorBalance[msg.sender] += total;
        emit ClaimUnallocatedTokens(msg.sender, activityId, total);
    }

    /*
     * Removes a depositor from the activity depositors array by putting the last item in the
     * position of the depositor we want to remove.
    */
    function removeDepositor(Activity storage activity, uint256 index) internal {
        // Swap the depositor to remove with the last depositor in the array
        uint256 lastIndex = activity.depositors.length - 1;
        if (lastIndex != index) {
            address lastDepositor = activity.depositors[lastIndex];
            activity.depositors[index] = lastDepositor;
            activity.depositorIndex[lastDepositor] = index;
        }

        // Remove the last depositor from the array
        delete activity.depositors[lastIndex];
    }

    /*
     * The owner has the authority to slash an activity, which involves transferring a portion of the allocated 
     * tokens to the treasury. In this process, each staker's stake is slashed proportionally based on their percentage 
     * contribution to the total balance.
     *
     *
     * Emits a `Slash` event.
     */
    function slash(uint256 activityId, uint256 slashPercentage) external onlyOwner returns(uint256 slashedAmount){
        Activity storage activity = activities[activityId];
        uint256 total = activity.depositors.length;
        for (uint256 i = 0; i < total; i++) {
            address depositor = activity.depositors[i];
            uint256 stake = activity.depositorStake[depositor].latest();
            uint256 toSlash = stake * slashPercentage / 100;
            activity.depositorStake[depositor].push(_subtract, toSlash);
            slashedAmount += toSlash;
        }

        activities[activityId].balance -= slashedAmount; 
        token.safeIncreaseAllowance(treasury, slashedAmount);
    
        emit Slash(activityId, slashedAmount);
        return slashedAmount;
    }

    /*
     * Claims total slashed balance and sends it to the treasury.
     *
     * Requirements:
     *
     * - Caller must be the owner.
     * - A slash has been made for the contract to approve the tokens before this transfer.
     *
     */
    function processSlashedFunds() external onlyOwner {
        token.safeTransfer(treasury, token.allowance(address(this), treasury));
    }

    /*
     * This function enables the owner to reward and close an activity.
     *
     * Requirements:
     *
     * - Caller must be the owner.
     * - `treasury` must have approved the tokens to be rewarded before calling the function.
     * - The activity should not have been rewarded previously.
     *
     * Emits a `Reward` event.
     */
    function rewardActivity(uint256 activityId, uint256 rewards) external onlyOwner {
        Activity storage activity = activities[activityId];
        uint256 activityBalance = activity.balance;
        require(activityBalance > 0, "Cannot reward an activity without stake");
        
        token.safeTransferFrom(owner(), address(this), rewards);

        uint256 total = activity.depositors.length;
        for (uint256 i = 0; i < total; i++) { 
            address depositor = activity.depositors[i];
            uint256 stake = activity.depositorStake[depositor].getAtProbablyRecentBlock(block.number - minTimeToReward);
            uint256 stakePercentage = ((stake - unallocationRequests[depositor][activityId].latest()) * 100) / activityBalance;
            activity.depositorReward[depositor] += ((rewards * stakePercentage) / 100);
        }
        emit Reward(activityId, rewards);
    }

    /*
     * Allows depositor to add the reward to their balance. The depositor's reward is calculated based on 
     * their proportionate share of the allocation. 
     *
     * NOTE: any tokens that are in the process of being unallocated are ineligible for rewards.
     *
     * Requirements:
     *
     * - Caller must be the `depositor` or an active delegate of `depositor`.
     *
     * Emits a `ClaimReward` event.
     */
    function claimReward(address depositor, uint256 activityId) external {
        require(
            depositor == msg.sender || delegations[msg.sender][depositor].active,
            "Invalid caller"
        );
        Activity storage activity = activities[activityId];

        uint256 available = activity.depositorReward[depositor];
        require(available > 0, "No Reward available for depositor");
        depositorBalance[depositor] += available;
        activity.depositorReward[depositor] = 0;
        emit ClaimReward(depositor, activityId, available);     
          
    }

    /*
     * Tokens that are neither allocated or delegated can be withdrawn from the contract. This function
     * will approve the funds to later be transferred.
     *
     * Requirements:
     *
     * - The caller should have balance.
     *
     * Emits a `Approve` event.
     */
    function requestWithdraw(uint256 amount) external {
        uint256 balance = depositorBalance[msg.sender];
        require(balance >= amount, "Insufficient funds");
        depositorBalance[msg.sender] = balance - amount;
        token.safeIncreaseAllowance(msg.sender, amount);
    }
    /*
     * This will perform the transfer of approved withdrawals.
     *
     * Requirements:
     *
     * - The caller should have approved balance.
     *
     * Emits a `Withdraw` event.
     */
    function withdraw() external nonReentrant {
        uint256 amount = token.allowance(address(this), msg.sender);
        
        token.safeTransfer(msg.sender, amount);
        token.safeDecreaseAllowance(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }
    
    /*
     * Returns the activity current balance and the total staked tokens by the depositor depositor.
     *
     */
    function getActivityAndDepositorBalanceAndReward(
        uint256 activityId,
        address depositor
    ) external view returns (uint256 balance, uint256 stake, uint256 reward) {
        Activity storage activity = activities[activityId];
        balance = activity.balance;
        stake = activity.depositorStake[depositor].latest();
        reward = activity.depositorReward[depositor];
    }

    function getTotalUnallocationRequests(address depositor, uint256 activityId) view external returns(uint256) {
        return unallocationRequests[depositor][activityId].latest();
    }

    function _add(uint256 a, uint256 b) private pure returns (uint256) {
        return a + b;
    }

    function _subtract(uint256 a, uint256 b) private pure returns (uint256) {
        return a - b;
    }
}
