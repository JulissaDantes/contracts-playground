// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/* This is just a single place to put the most use low level calls in order to not forget them. This is not to be deployed */
// https://docs.soliditylang.org/en/v0.8.20/yul.html#

contract LowLevel {
    address[2] owners = [0xC09758D8fe8fF0545b8005CA2f82947E4dfd3A05, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266];

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

    function sendETH(address to, uint256 amount) public {
        bool success;
        assembly {
            for {let i := 0} lt(i,2) { i := add(i, 1)} {
                let owner := sload(i)
                if eq(to, owner) {
                    success := call(gas(), to, amount, 0, 0, 0, 0)
                }
            }
        }
        require(success, "Failed");
    }
    
}