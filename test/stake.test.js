const { expect } = require('chai');
const { ethers } = require('hardhat');
const { mine } = require('@nomicfoundation/hardhat-network-helpers');

describe('Stake contract', function () {
  let token;
  let stake;
  let treasury;
  let depositor;
  let amount;
  let activity;
  let initialSupply;
  const UNDELEGATE_DELAY = 60;
  const UNALLOCATE_DELAY = 60;
  const SLASH_PERCENTAGE = 10;

  beforeEach(async function () {
    [treasury, depositor, delegate, otherDepositor] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
    const Stake = await ethers.getContractFactory('Stake');
    stake = await Stake.deploy(token.address, treasury.address, UNDELEGATE_DELAY, UNALLOCATE_DELAY, 3);

    amount = 10;
    activity = 1;
    initialSupply = amount * 10;
    await token.connect(depositor).mint(initialSupply);
    await token.connect(otherDepositor).mint(amount);
    await token.connect(depositor).approve(stake.address, initialSupply);
  });

  it('Treasury cannot be zero address', async () => {
    const Stake = await ethers.getContractFactory('Stake');
    await expect(
      Stake.deploy(token.address, '0x0000000000000000000000000000000000000000', UNDELEGATE_DELAY, UNALLOCATE_DELAY, 3),
    ).to.be.revertedWith('Invalid treasury');
  });

  it('The contract deploys successfully and the correct initial values are set', async () => {
    expect(await stake.token()).to.be.eq(token.address);
    expect(await stake.treasury()).to.be.eq(treasury.address);
    expect(await stake.undelegateDelay()).to.be.eq(UNDELEGATE_DELAY);
    expect(await stake.unallocateDelay()).to.be.eq(UNALLOCATE_DELAY);
    expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
  });

  it('A depositor can deposit tokens successfully', async () => {
    await stake.connect(depositor).deposit(amount);
    const event = (await stake.queryFilter('Deposit')).pop();
    expect(event.args.depositor).to.be.eq(depositor.address);
    expect(event.args.amount).to.be.eq(amount);

    expect(await token.balanceOf(stake.address)).to.be.eq(amount);
    expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount);
  });

  it('A depositor cannot deposit tokens if they do not have sufficient balance', async () => {
    await expect(stake.connect(depositor).deposit(initialSupply * 2)).to.be.revertedWith('Insufficient balance');
  });

  describe('Depositor operations', () => {
    beforeEach(async function () {
      await stake.connect(depositor).deposit(amount);
    });

    describe('Delegations', () => {
      beforeEach(async function () {
        await stake.connect(depositor).delegate(amount, delegate.address);
      });

      it('A depositor can delegate tokens to a delegate successfully', async () => {
        const event = (await stake.queryFilter('Delegate')).pop();
        expect(event.args.delegator).to.be.eq(depositor.address);
        expect(event.args.delegate).to.be.eq(delegate.address);
        expect(event.args.amount).to.be.eq(amount);

        expect((await stake.delegations(delegate.address, depositor.address)).amount).to.be.eq(amount);
        expect((await stake.delegations(delegate.address, depositor.address)).active).to.be.true;
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
      });

      it('A depositor cannot delegate tokens if they do not have sufficient funds', async () => {
        await token.connect(depositor).approve(stake.address, 1);
        await stake.connect(depositor).deposit(1);

        await expect(stake.connect(depositor).delegate(amount, otherDepositor.address)).to.be.revertedWith(
          'Insufficient funds',
        );
      });

      it('A depositor can undelegate tokens from a delegate successfully', async () => {
        await stake.connect(depositor).undelegate(amount / 2, delegate.address);
        const event = (await stake.queryFilter('Undelegate')).pop();
        expect(event.args.delegator).to.be.eq(depositor.address);
        expect(event.args.delegate).to.be.eq(delegate.address);
        expect(event.args.amount).to.be.eq(amount / 2);

        expect((await stake.delegations(delegate.address, depositor.address)).amount).to.be.eq(amount / 2);
        expect((await stake.delegations(delegate.address, depositor.address)).active).to.be.true;
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
      });

      it('A delegate becomes inactive if all funds are undelegated', async () => {
        await stake.connect(depositor).undelegate(amount, delegate.address);

        expect((await stake.delegations(delegate.address, depositor.address)).active).to.be.false;
      });

      it('A depositor can claim undelegated funds after delay', async () => {
        await stake.connect(depositor).undelegate(amount / 2, delegate.address);

        const blocks = (await ethers.provider.getBlock('latest')).number + UNDELEGATE_DELAY;
        await mine(blocks);
        await stake.connect(depositor).claimUndelegatedTokens();

        const event = (await stake.queryFilter('ClaimUndelegatedTokens')).pop();
        expect(event.args.delegator).to.be.eq(depositor.address);
        expect(event.args.amount).to.be.eq(amount / 2);
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount / 2);
      });

      it('A depositor cannot claim undelegated funds before delay', async () => {
        await stake.connect(depositor).undelegate(amount / 2, delegate.address);
        await expect(stake.connect(depositor).claimUndelegatedTokens()).to.be.revertedWith('Funds not yet available');
      });

      it('When depositor calls claimUndelegatedTokens only available funds are available', async () => {
        await stake.connect(depositor).undelegate(amount / 2, delegate.address);

        const blocks = (await ethers.provider.getBlock('latest')).number + UNDELEGATE_DELAY;
        await mine(blocks);
        await stake.connect(depositor).undelegate(amount / 2, delegate.address);
        await stake.connect(depositor).claimUndelegatedTokens();
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount / 2);

        const newBlocks = (await ethers.provider.getBlock('latest')).number + UNDELEGATE_DELAY;
        await mine(newBlocks);

        await stake.connect(depositor).claimUndelegatedTokens();
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount);
      });

      it('A depositor cannot undelegate more than delegated tokens', async () => {
        await expect(stake.connect(depositor).undelegate(amount * 2, delegate.address)).to.be.revertedWith(
          'Invalid undelegation parameters',
        );
      });

      it('A depositor cannot undelegate non delegate', async () => {
        await expect(stake.connect(depositor).undelegate(0, treasury.address)).to.be.revertedWith(
          'Invalid undelegation parameters',
        );
      });
    });

    it('A depositor can allocate tokens to an activity successfully', async () => {
      await stake.connect(depositor).allocate(amount, activity, depositor.address);
      const event = (await stake.queryFilter('Allocate')).pop();
      expect(event.args.allocator).to.be.eq(depositor.address);
      expect(event.args.activityId).to.be.eq(activity);
      expect(event.args.amount).to.be.eq(amount);
      const activityInfo = await stake.getActivityAndDepositorBalanceAndReward(activity, depositor.address);

      expect(activityInfo.balance).to.be.eq(amount);
      expect(activityInfo.stake).to.be.eq(amount);
      expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
    });

    it('A depositor cannot allocate tokens if they do not have sufficient funds', async () => {
      const amountToAllocate = amount * 2;
      await expect(stake.connect(depositor).allocate(amountToAllocate, activity, depositor.address)).to.be.revertedWith(
        'Insufficient funds',
      );
    });

    it('A depositor can unallocate tokens from an activity successfully', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).allocate(amount, activity, depositor.address);

      await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
      const event = (await stake.queryFilter('Unallocate')).pop();
      expect(event.args.unallocator).to.be.eq(depositor.address);
      expect(event.args.activityId).to.be.eq(activity);
      expect(event.args.amount).to.be.eq(toUnallocate);

      expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
      expect(await stake.getTotalUnallocationRequests(depositor.address, activity)).to.be.eq(toUnallocate);
    });

    it('A depositor cannot unallocate tokens if they do not have sufficient funds allocated', async () => {
      const toUnallocate = amount * 2;

      await stake.connect(depositor).allocate(amount, activity, depositor.address);
      await expect(stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address)).to.be.revertedWith(
        'Not enough staked tokens',
      );
    });

    it('A delegate can allocate tokens to an activity successfully', async () => {
      await stake.connect(depositor).delegate(amount, delegate.address);

      await stake.connect(delegate).allocate(amount, activity, depositor.address);

      const activityInfo = await stake.getActivityAndDepositorBalanceAndReward(activity, depositor.address);

      expect(activityInfo.balance).to.be.eq(amount);
      expect(activityInfo.stake).to.be.eq(amount);
      expect((await stake.delegations(delegate.address, depositor.address)).amount).to.be.eq(0);
    });

    it('A delegate can unallocate tokens from an activity successfully', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).delegate(amount, delegate.address);
      await stake.connect(delegate).allocate(amount, activity, depositor.address);

      await stake.connect(delegate).unallocate(toUnallocate, activity, depositor.address);

      expect(await stake.depositorBalance(depositor.address)).to.be.eq(0);
      expect((await stake.delegations(delegate.address, depositor.address)).amount).to.be.eq(0);
      expect(await stake.getTotalUnallocationRequests(depositor.address, activity)).to.be.eq(toUnallocate);
    });

    it('A delegate cannot unallocate tokens if they do not have sufficient funds allocated', async () => {
      const toUnallocate = amount * 2;

      await stake.connect(depositor).delegate(amount, delegate.address);
      await stake.connect(delegate).allocate(amount, activity, depositor.address);

      await expect(stake.connect(delegate).unallocate(toUnallocate, activity, depositor.address)).to.be.revertedWith(
        'Not enough delegated tokens were staked',
      );
    });

    it('A delegate cannot unallocate more than delegated funds allocated, even if delegator has the enough stake', async () => {
      const toUnallocate = amount * 2;
      await stake.connect(depositor).deposit(amount);
      await stake.connect(depositor).delegate(amount, delegate.address);
      await stake.connect(delegate).allocate(amount, activity, depositor.address);
      // depositor deposits making it's stake amount * 2.
      await stake.connect(depositor).allocate(amount, activity, depositor.address);

      await expect(stake.connect(delegate).unallocate(toUnallocate, activity, depositor.address)).to.be.revertedWith(
        'Not enough delegated tokens were staked',
      );
    });

    it('A delegate cannot unallocate tokens if they do not have active delegation', async () => {
      await stake.connect(depositor).delegate(amount, delegate.address);
      await stake.connect(delegate).allocate(amount, activity, depositor.address);

      await stake.connect(depositor).undelegate(0, delegate.address);
      await expect(stake.connect(delegate).unallocate(amount, activity, depositor.address)).to.be.revertedWith(
        'Only depositor or a delegate can perform this operation',
      );
    });

    it('A depositor can claim unallocated funds after delay', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).allocate(amount, activity, depositor.address);

      await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
      const blocks = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
      await mine(blocks);
      await stake.connect(depositor).claimUnallocatedTokens(activity);

      const event = (await stake.queryFilter('ClaimUnallocatedTokens')).pop();
      expect(event.args.unallocator).to.be.eq(depositor.address);
      expect(event.args.activityId).to.be.eq(activity);
      expect(event.args.amount).to.be.eq(toUnallocate);
      expect(await stake.depositorBalance(depositor.address)).to.be.eq(toUnallocate);
    });

    it('A depositor cannot claim unallocated funds before delay', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).allocate(amount, activity, depositor.address);

      await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
      await expect(stake.connect(depositor).claimUnallocatedTokens(activity)).to.be.revertedWith(
        'Funds not yet available',
      );
    });

    it('When depositor calls claimUnallocatedTokens only available funds are available', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).allocate(amount, activity, depositor.address);

      await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
      const blocks = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
      await mine(blocks);
      await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
      await stake.connect(depositor).claimUnallocatedTokens(activity);
      expect(await stake.depositorBalance(depositor.address)).to.be.eq(toUnallocate);

      const blocks2 = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
      await mine(blocks2);
      await stake.connect(depositor).claimUnallocatedTokens(activity);
      expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount);
    });

    it('A delegate can unallocate funds for delegator to claim', async () => {
      const toUnallocate = amount / 2;

      await stake.connect(depositor).delegate(amount, delegate.address);
      await stake.connect(delegate).allocate(amount, activity, depositor.address);

      await stake.connect(delegate).unallocate(toUnallocate, activity, depositor.address);
      const blocks = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
      await mine(blocks);

      await stake.connect(depositor).claimUnallocatedTokens(activity);
      expect(await stake.depositorBalance(depositor.address)).to.be.eq(toUnallocate);
    });

    describe('Reward and slash activity', () => {
      beforeEach(async function () {
        await stake.connect(depositor).allocate(amount, activity, depositor.address);
      });

      it('Only owner can reward activity', async () => {
        await expect(stake.connect(depositor).rewardActivity(activity, amount)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });

      it('Only owner can slash activity', async () => {
        await expect(stake.connect(depositor).slash(activity, SLASH_PERCENTAGE)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });

      it('An activity can be rewarded successfully', async () => {
        const reward = amount;
        // default signer is treasury
        await token.mint(amount);
        await token.approve(stake.address, amount);

        const priorBalance = await token.balanceOf(stake.address);
        await stake.rewardActivity(activity, reward);

        const event = (await stake.queryFilter('Reward')).pop();
        expect(event.args.activityId).to.be.eq(activity);
        expect(event.args.reward).to.be.eq(reward);

        expect(await token.balanceOf(stake.address)).to.be.eq(priorBalance.add(reward));
      });

      it('An activity can be rewarded several times successfully', async () => {
        const reward = amount;

        await token.mint(reward * 2);
        await token.approve(stake.address, reward);
        await stake.rewardActivity(activity, reward);

        await token.approve(stake.address, reward);
        await stake.rewardActivity(activity, reward);

        const info = await stake.getActivityAndDepositorBalanceAndReward(activity, depositor.address);
        expect(info.reward).to.be.eq(reward * 2); // awarded twice for depositor with 100% of activity balance
      });

      it('An activity without stake cannot be rewarded', async () => {
        const reward = amount;
        const activityId = activity * 3;

        await token.mint(reward * 2);
        await token.approve(stake.address, reward);
        await expect(stake.rewardActivity(activityId, reward)).to.be.revertedWith(
          'Cannot reward an activity without stake',
        );
      });

      it('A depositor can claim their rewards successfully when activity has several rewards', async () => {
        const reward = amount;
        await token.connect(otherDepositor).approve(stake.address, amount);
        await stake.connect(otherDepositor).deposit(amount);
        await stake.connect(otherDepositor).allocate(amount, activity, otherDepositor.address);

        await token.mint(amount * 2);
        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, reward);

        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, reward);
        await stake.connect(depositor).claimReward(depositor.address, activity);
        await stake.connect(otherDepositor).claimReward(otherDepositor.address, activity);

        expect(await stake.depositorBalance(depositor.address)).to.be.eq(reward);
        expect(await stake.depositorBalance(otherDepositor.address)).to.be.eq(reward);
      });

      it('A depositor can only collect rewards on staked tokens with minimum amount of time staked', async () => {
        const reward = amount;

        await token.mint(amount);
        await token.approve(stake.address, amount);
        await token.connect(otherDepositor).approve(stake.address, amount);
        await stake.connect(otherDepositor).deposit(amount);
        await stake.connect(otherDepositor).allocate(amount, activity, otherDepositor.address);

        await stake.rewardActivity(activity, reward);
        await expect(stake.connect(otherDepositor).claimReward(otherDepositor.address, activity)).to.be.revertedWith(
          'No Reward available for depositor',
        );
      });

      it('A depositor can claim their rewards successfully', async () => {
        const reward = amount;
        await token.connect(otherDepositor).approve(stake.address, amount);
        await stake.connect(otherDepositor).deposit(amount);
        await stake.connect(otherDepositor).allocate(amount, activity, otherDepositor.address);

        // default signer is treasury
        await token.mint(amount);
        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, reward);
        await stake.connect(depositor).claimReward(depositor.address, activity);
        await stake.connect(otherDepositor).claimReward(otherDepositor.address, activity);

        const event = (await stake.queryFilter('ClaimReward')).pop();
        expect(event.args.depositor).to.be.eq(otherDepositor.address);
        expect(event.args.activityId).to.be.eq(activity);
        expect(event.args.reward).to.be.eq(reward / 2);
        // both depositors represent 50%, both depositors balance should be = reward / 2
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(reward / 2);
        expect(await stake.depositorBalance(otherDepositor.address)).to.be.eq(reward / 2);
      });

      it('Tokens waiting to be unallocated do not receive rewards', async () => {
        const reward = amount;
        const toUnallocate = amount / 2;
        await token.mint(amount);
        await token.approve(stake.address, amount);
        await stake.connect(depositor).unallocate(toUnallocate, activity, depositor.address);
        await stake.rewardActivity(activity, reward);
        await stake.connect(depositor).claimReward(depositor.address, activity);

        // stake - unallocated tokens = 5, activity balance = 10, should get 5 + staked tokens
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(reward - toUnallocate);
      });

      it('A depositor cannot claim a claimed rewards', async () => {
        const reward = amount;
        // default signer is treasury
        await token.mint(amount);
        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, reward);
        await stake.connect(depositor).claimReward(depositor.address, activity);

        await expect(stake.connect(depositor).claimReward(depositor.address, activity)).to.be.revertedWith(
          'No Reward available for depositor',
        );
      });

      it('A depositor cannot claim reward if waits to stake tokens after the reward is given', async () => {
        await token.mint(amount);
        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, amount);

        await token.connect(otherDepositor).approve(stake.address, amount);
        await stake.connect(otherDepositor).deposit(amount);
        await stake.connect(otherDepositor).allocate(amount, activity, otherDepositor.address);
        await expect(stake.connect(otherDepositor).claimReward(otherDepositor.address, activity)).to.be.revertedWith(
          'No Reward available for depositor',
        );
      });

      it("A depositor cannot claim another depositor's reward", async () => {
        await token.mint(amount);
        await token.approve(stake.address, amount);
        await stake.rewardActivity(activity, amount);

        await expect(stake.connect(otherDepositor).claimReward(depositor.address, activity)).to.be.revertedWith(
          'Invalid caller',
        );
      });

      it('An activity can be slashed successfully', async () => {
        const slashedAmount = 2; // 20 activity balance, 10% of 20 = 2.
        await token.connect(otherDepositor).approve(stake.address, amount);
        await stake.connect(otherDepositor).deposit(amount);
        await stake.connect(otherDepositor).allocate(amount, activity, otherDepositor.address);

        const initialTreasuryBalance = await token.balanceOf(treasury.address);
        const treasuryBalance = initialTreasuryBalance + slashedAmount;
        await stake.slash(activity, SLASH_PERCENTAGE);
        const event = (await stake.queryFilter('Slash')).pop();
        expect(event.args.activityId).to.be.eq(activity);
        expect(event.args.slashedAmount).to.be.eq(slashedAmount);

        expect(await token.allowance(stake.address, treasury.address)).to.be.eq(treasuryBalance);

        await stake.processSlashedFunds();
        expect(await token.balanceOf(treasury.address)).to.be.eq(treasuryBalance);

        const [balance, depositor1Balance] = await stake.getActivityAndDepositorBalanceAndReward(
          activity,
          depositor.address,
        );
        const [, depositor2Balance] = await stake.getActivityAndDepositorBalanceAndReward(
          activity,
          otherDepositor.address,
        );

        expect(balance).to.be.eq(amount * 2 - slashedAmount);
        expect(depositor1Balance).to.be.eq(amount - (amount * SLASH_PERCENTAGE) / 100);
        expect(depositor2Balance).to.be.eq(amount - (amount * SLASH_PERCENTAGE) / 100);
      });

      it('Unallocated tokens in delay period can be slashed successfully', async () => {
        const slashedAmount = 1; // 10 activity balance, 10% of 10 = 1.

        await stake.connect(depositor).unallocate(amount, activity, depositor.address);
        await stake.slash(activity, SLASH_PERCENTAGE);

        const blocks = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
        await mine(blocks);
        await stake.connect(depositor).claimUnallocatedTokens(activity);
        expect(await stake.depositorBalance(depositor.address)).to.be.eq(amount - slashedAmount);
      });

      it('Depositor can reentering activity depositors list and its not slashed several times', async () => {
        await stake.connect(depositor).unallocate(amount, activity, depositor.address);
        const blocks = (await ethers.provider.getBlock('latest')).number + UNALLOCATE_DELAY;
        await mine(blocks);
        await stake.connect(depositor).claimUnallocatedTokens(activity);
        await stake.connect(depositor).allocate(amount, activity, depositor.address);

        await stake.slash(activity, SLASH_PERCENTAGE);
        await stake.processSlashedFunds();

        const [, depositor1Balance] = await stake.getActivityAndDepositorBalanceAndReward(activity, depositor.address);

        expect(depositor1Balance).to.be.eq(amount - (amount * SLASH_PERCENTAGE) / 100);
      });
    });

    describe('Withdraw', () => {
      it('A depositor can withdraw tokens successfully', async () => {
        await stake.connect(depositor).requestWithdraw(amount);
        await stake.connect(depositor).withdraw();

        const event = (await stake.queryFilter('Withdraw')).pop();
        expect(event.args.depositor).to.be.eq(depositor.address);
        expect(event.args.amount).to.be.eq(amount);
        expect(await token.balanceOf(depositor.address)).to.be.eq(initialSupply);
      });

      it('A depositor cannot withdraw tokens if amount is greater than available', async () => {
        await expect(stake.connect(depositor).requestWithdraw(amount * 2)).to.be.revertedWith('Insufficient funds');
      });

      it('A depositor can withdraw rewarded tokens successfully', async () => {
        const reward = amount / 2;

        await stake.connect(depositor).allocate(amount, activity, depositor.address);
        await token.mint(reward);
        await token.approve(stake.address, reward);
        await stake.rewardActivity(activity, reward);

        await stake.connect(depositor).claimReward(depositor.address, activity);
        const balance = await token.balanceOf(depositor.address);
        await stake.connect(depositor).requestWithdraw(reward);
        await stake.connect(depositor).withdraw();

        const event = (await stake.queryFilter('Withdraw')).pop();
        expect(event.args.depositor).to.be.eq(depositor.address);
        expect(event.args.amount).to.be.eq(reward);
        expect(await token.balanceOf(depositor.address)).to.be.eq(balance.add(reward));
      });
    });
  });
});
