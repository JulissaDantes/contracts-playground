// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Visibility {
    struct One {
        uint8 x;
        bool y;
    }
    // case 1 the function its public and called by another internal function
    function foo(One memory one) external {
        barPublic(one);
    }

    function barPublic(One memory one) public {
        one.x = 0;
    }
    // case 2 visibility optimization
    function foo2(One memory one) external {
        barPublic(one);
    }

    function barPublic2(One memory one) external {
        barinternal(one);
    }

    function barinternal(One memory one) internal {
        one.x = 0;
    }
}