// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Attackee is ReentrancyGuard {
    uint256 constant limitPerAddress = 3;
    // internal function with reentrancy guard that calls external contract
    function _internal(address to) internal nonReentrant {
        console.log("Inside the internal function");
        Attacker(to).ext();
    }

    // function using internal function with loop
    function ext(address to) external {
        for(uint256 i; i < limitPerAddress; i++){
            _internal(to);
            console.log("finished one round");
        }
        
    }
}

contract Attacker {
    Attackee public contractToAttack;
    
    constructor(address _contractToAttackAddress) {
        contractToAttack = Attackee(_contractToAttackAddress);
    }

    // function to call and perform the reentrancy attack
    function ext() external {
        console.log("inside the attacker function");
        contractToAttack.ext(address(this));
    }
}