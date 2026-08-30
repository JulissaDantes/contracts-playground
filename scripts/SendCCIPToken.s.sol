// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";

import {IERC20} from
    "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IRouterClient} from
    "chainlink-local/lib/chainlink-ccip/chains/evm/contracts/interfaces/IRouterClient.sol";

import {Client} from
    "chainlink-local/lib/chainlink-ccip/chains/evm/contracts/libraries/Client.sol";

/// @dev Plug and Play script to send CCIP ERC20 tokens between chains. 
/// forge script script/SendCCIPToken.s.sol:SendCCIPToken --rpc-url $ORIGIN_CHAIN_RPC_URL --private-key $BROADCASTER_KEY --slow --broadcast
contract SendCCIPToken is Script {
    address internal constant ORIGIN_CHAIN_ROUTER =
        0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f;

    uint64 internal constant ORIGIN_CHAIN_SELECTOR =
        13264668187771770619;//bnb smart chain

    uint64 internal constant DEST_CHAIN_SELECTOR =
        16015286601757825753;//eth sepolia

    /// @dev token in hub chain
    address internal constant ORIGIN_TOKEN =
        0X0;//token at bnb sepolia

    uint256 internal constant AMOUNT = 1000;

    function run() external {
        uint256 key = _getKey();
        address sender = vm.addr(key);

        // Send the token to the same address on remote chain.
        address receiver = sender;

        Client.EVMTokenAmount[] memory tokenAmounts =
            new Client.EVMTokenAmount[](1);

        tokenAmounts[0] = Client.EVMTokenAmount({
            token: ORIGIN_TOKEN,
            amount: AMOUNT
        });

        Client.EVM2AnyMessage memory message =
            Client.EVM2AnyMessage({
                receiver: abi.encode(receiver),
                data: "",
                tokenAmounts: tokenAmounts,
                feeToken: address(0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({
                        gasLimit: 0
                    })
                )
            });

        IRouterClient router =
            IRouterClient(ORIGIN_CHAIN_ROUTER);

        uint256 fee = router.getFee(
            DEST_CHAIN_SELECTOR,
            message
        );

        console2.log("Sender:", sender);
        console2.log("Receiver:", receiver);
        console2.log("Amount:", AMOUNT);
        console2.log("CCIP fee:", fee);

        require(
            IERC20(ORIGIN_TOKEN).balanceOf(sender) >= AMOUNT,
            "insufficient token balance"
        );

        require(
            sender.balance >= fee,
            "insufficient ETH for CCIP fee"
        );

        vm.startBroadcast(key);

        IERC20(ORIGIN_TOKEN).approve(
            ORIGIN_CHAIN_ROUTER,
            AMOUNT
        );

        bytes32 messageId = router.ccipSend{value: fee}(
            DEST_CHAIN_SELECTOR,
            message
        );

        vm.stopBroadcast();

        console2.logBytes32(messageId);
    }

    function _getKey() internal view returns (uint256) {
        string memory rawKey =
            vm.envString("BROADCASTER_KEY");

        bytes memory value = bytes(rawKey);

        bool hasPrefix =
            value.length >= 2
                && value[0] == bytes1("0")
                && (
                    value[1] == bytes1("x")
                        || value[1] == bytes1("X")
                );

        return vm.parseUint(
            hasPrefix
                ? rawKey
                : string.concat("0x", rawKey)
        );
    }
}
