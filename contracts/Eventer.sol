// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Evener {
    event LogRewardPaidByPool(
    int256 assetId,
    address indexed user,
    int256 amount)
    ;

    event LogRewardPoolAdded(
       uint256 indexed assetId,
       uint256 phase,
       uint256 allocPoint)
    ;

    event LogUpdatePoolRewards(
       uint256 indexed assetId,
       uint256 lastRewardTime,
       uint256 globalPoolBalance,
       uint256 accRewardPerShare)
    ;

    function foo1() public {
        emit LogRewardPaidByPool(1,address(this),10);
    }

    function foo2() public {
        emit LogRewardPoolAdded(2,23,3);
    }

    function foo3() public {
        emit LogUpdatePoolRewards(3,4,5,6);
    }
}