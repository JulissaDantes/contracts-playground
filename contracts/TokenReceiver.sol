// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
//import "@openzeppelin/contracts/token/ERC721/LeToken.sol";
import "./LeToken.sol";
import "hardhat/console.sol";

contract TokenReceiver is ERC721Holder {
    LeToken internal token;
    constructor(LeToken _token) {
        token = _token;
    }

    function onERC721Received(
        address sender,
        address from,
        uint256 tokenId,
        bytes memory 
    ) public virtual override returns (bytes4) {

        console.log("Came to the receiver", address(this), from);
        if (from == address(0)) {
            token.safeMint(address(this), tokenId + 1);
            console.log("Returning from mint");
        } else {
            // re-enter tokens contract
            token.safeTransferFrom(sender, address(this), tokenId);
            //Cannot use delegation because the call to this contract is made frm the contract, not from the user.
            /*(bool ok, ) = address(token).delegatecall(
                abi.encodeCall(token.possibleUnsafeTransfer, (sender, address(this), tokenId))
            );
            require(ok);*/
            console.log("Returning from transfer");
        }
        
        return this.onERC721Received.selector; 
    }
}