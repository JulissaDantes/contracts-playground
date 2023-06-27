// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/*
* Users should have the ability to deposit and withdraw funds. However, each withdrawal request must 
* undergo an approval process and be subjected to a waiting period to prevent potential funds theft.
*/
contract TimelockVault {
    event Deposit(address indexed depositor, uint256 amount);
    event Withdraw(address indexed depositor, uint256 amount);

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public request;

    function deposit(uint256 amount) external virtual {
        
        emit Deposit(msg.sender, amount);
    }

    function requestWithdraw(uint256 amount) external virtual {
        
        emit Withdraw(msg.sender, amount);
    }

    function processWithdraw(uint256 amount) external virtual {
        
        emit Withdraw(msg.sender, amount);
    }
}