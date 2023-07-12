// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/* This is just a single place to put the most use low level calls in order to not forget them */

contract LowLevel {

    function getValue() public view returns(uint256) {
        assembly {
            let v:= sload(0)
            mstore(0x80,v)
            return(0x80, 32)
        }
    }

    function setValue(uint256 newValue) public {
        assembly {
            sstore(0, newValue)
        }
    }
    
}