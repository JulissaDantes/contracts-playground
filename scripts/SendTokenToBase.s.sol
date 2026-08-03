// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";

import {IERC20} from
    "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IRouterClient} from
    "chainlink-local/lib/chainlink-ccip/chains/evm/contracts/interfaces/IRouterClient.sol";

import {Client} from
    "chainlink-local/lib/chainlink-ccip/chains/evm/contracts/libraries/Client.sol";

/// @dev Plug and Play script to send CCIP ERC20 tokens between chains. Currently working between base and eth sepolia networks
contract SendTokenToBase is Script {
    address internal constant ETH_SEPOLIA_ROUTER =
        0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59;

    uint64 internal constant BASE_SEPOLIA_SELECTOR =
        10344971235874465080;

    /// @dev token in hub chain
    address internal constant HUB_TOKEN =
        0x0;

    uint256 internal constant AMOUNT = 1000;

    function run() external {
        uint256 key = _getKey();
        address sender = vm.addr(key);

        // Send the token to the same address on Base Sepolia.
        address receiver = sender;

        Client.EVMTokenAmount[] memory tokenAmounts =
            new Client.EVMTokenAmount[](1);

        tokenAmounts[0] = Client.EVMTokenAmount({
            token: HUB_TOKEN,
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
            IRouterClient(ETH_SEPOLIA_ROUTER);

        uint256 fee = router.getFee(
            BASE_SEPOLIA_SELECTOR,
            message
        );

        console2.log("Sender:", sender);
        console2.log("Receiver:", receiver);
        console2.log("Amount:", AMOUNT);
        console2.log("CCIP fee:", fee);

        require(
            IERC20(HUB_TOKEN).balanceOf(sender) >= AMOUNT,
            "insufficient token balance"
        );

        require(
            sender.balance >= fee,
            "insufficient ETH for CCIP fee"
        );

        vm.startBroadcast(key);

        IERC20(HUB_TOKEN).approve(
            ETH_SEPOLIA_ROUTER,
            AMOUNT
        );

        bytes32 messageId = router.ccipSend{value: fee}(
            BASE_SEPOLIA_SELECTOR,
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