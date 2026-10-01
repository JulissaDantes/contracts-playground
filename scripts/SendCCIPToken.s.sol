// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IRouterClient} from "chainlink-ccip/chains/evm/contracts/interfaces/IRouterClient.sol";

import {Client} from "chainlink-ccip/chains/evm/contracts/libraries/Client.sol";

/// @dev Plug and Play script to send CCIP ERC20 tokens between chains.
/// forge script script/SendCCIPToken.s.sol:SendCCIPToken --rpc-url $URL --private-key $KEY --slow --broadcast
contract SendCCIPToken is Script {
    struct Config {
        address originRouter;
        address originToken;
        uint64 originSelector;
        uint64 destSelector;
    }
    address constant HUB_ROUTER = ;
    address constant SPOKE_ROUTER = ; //bnb
    uint64 constant HUB_SELECTOR = ;
    uint64 constant SPOKE_SELECTOR = ; //bnb
    address constant HUB_ASSET_TOKEN = ;
    address constant SPOKE_ASSET_TOKEN = ;

    Config internal hub = Config({
        originRouter: HUB_ROUTER,
        originToken: HUB_ASSET_TOKEN,
        originSelector: HUB_SELECTOR,
        destSelector: SPOKE_SELECTOR
    });

    Config internal spoke = Config({
        originRouter: SPOKE_ROUTER,
        originToken: SPOKE_ASSET_TOKEN,
        originSelector: SPOKE_SELECTOR,
        destSelector: HUB_SELECTOR
    });

    uint256 internal constant AMOUNT = 20;

    function run() external {
        Config memory config;
        if (block.chainid == 1) {
            config = hub;
        } else {
            config = spoke;
        }
        uint256 key = _getKey();
        address sender = vm.addr(key);

        // Send the token to the same address on remote chain.
        address receiver = sender;

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);

        tokenAmounts[0] = Client.EVMTokenAmount({token: config.originToken, amount: AMOUNT});

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 0}))
        });

        IRouterClient router = IRouterClient(config.originRouter);

        uint256 fee = router.getFee(config.destSelector, message);

        console2.log("Sender:", sender);
        console2.log("Receiver:", receiver);
        console2.log("Amount:", AMOUNT);
        console2.log("CCIP fee:", fee);

        require(IERC20(config.originToken).balanceOf(sender) >= AMOUNT, "insufficient token balance");

        require(sender.balance >= fee, "insufficient ETH for CCIP fee");

        vm.startBroadcast(key);

        IERC20(config.originToken).approve(config.originRouter, AMOUNT);

        bytes32 messageId = router.ccipSend{value: fee}(config.destSelector, message);

        vm.stopBroadcast();
        console2.log("Message ID: ");
        console2.logBytes32(messageId);
    }

    function _getKey() internal view returns (uint256) {
        string memory rawKey = vm.envString("BROADCASTER_KEY");

        bytes memory value = bytes(rawKey);

        bool hasPrefix =
            value.length >= 2 && value[0] == bytes1("0") && (value[1] == bytes1("x") || value[1] == bytes1("X"));

        return vm.parseUint(hasPrefix ? rawKey : string.concat("0x", rawKey));
    }
}
