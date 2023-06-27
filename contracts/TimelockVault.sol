// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/*
* Very simple PoW of a contract where users should have the ability to deposit and withdraw funds. However,
* each withdrawal request must undergo an approval process and be subjected to a waiting period to prevent
* potential funds theft.
*/
contract TimelockVault {
    event Deposit(address indexed depositor, uint256 amount);
    event Withdraw(address indexed depositor, uint256 amount);

    uint256 public immutable interval;
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public request;

    constructor(uint256 timeInterval) {
        interval = timeInterval;
    }

    // TODO use checkpoints to keep track of the deposits or the withdraw requests to be able to 
    // handle different amount but also get total of reuqested withdraw total.
    function deposit() payable external virtual {
        require(msg.value > 0, "Not nough funds");
        deposits[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // TODO must support concurrent requests of different amounts in different points in time
    function requestWithdraw(uint256 amount) external virtual {
        require(deposits[msg.sender] >= amount, "Not nough funds");
        request[msg.sender] = amount;
        emit Withdraw(msg.sender, amount);
    }
    // Function to call when user notices a problem or just want to cancel the withdraw
    function cancelWithdraw(uint256 amount) external virtual {
        require(deposits[msg.sender] >= amount, "Not nough funds");
        request[msg.sender] = amount;
        emit Withdraw(msg.sender, amount);
    }

    function processWithdraw(uint256 amount) external virtual {
        // require timelock and funds amount
        request[msg.sender] -= amount;
        emit Withdraw(msg.sender, amount);
    }
}