pragma solidity ^0.8.26;
 
import {Test} from "forge-std/Test.sol";
 
contract ContractXTest is Test {
    uint256 testNumber;
 
    function setUp() public {
        testNumber = 42;
    }
 
    function test_NumberIs42() public {
        assertEq(testNumber, 42);
    }
 
    /// forge-config: default.allow_internal_expect_revert = true
    function testRevert_Subtract43() public {
        vm.expectRevert();
        testNumber -= 43;
    }
}