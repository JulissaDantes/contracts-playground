// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./LeToken.sol";
import "./WizardToken.sol";
import "hardhat/console.sol";

contract TokenReceiver is ERC721Holder {
    LeToken internal token;
    constructor(LeToken _token) {
        token = _token;
    }
    uint256[] public tokenIds;
    mapping(uint256 => bool) private stolen;

    function onERC721Received(
        address sender,
        address from,
        uint256 tokenId,
        bytes memory 
    ) public virtual override returns (bytes4) {

        console.log("Came to the receiver", address(this), from);
        if (from == address(0)) {
            console.log("Returning from mint");
            token.safeMint(address(this), tokenId + 1);
        } else {
            console.log("Returning from transfer");
            // re-enter tokens contract
            stolen[tokenId] = true;
            // re-enter tokens contract
            for (uint i; i < tokenIds.length; i++) {
                console.log("is", tokenIds[i],"stolen?",stolen[tokenIds[i]]);
                if (!stolen[tokenIds[i]]) {
                    token.safeTransferFrom(sender, address(this), tokenIds[i]);
                    stolen[tokenIds[i]] = true;
                }
            }
        }
        
        return this.onERC721Received.selector; 
    }

    function addNewToken(uint256 tokenId) public {
        tokenIds.push(tokenId);
    }

    function getTokens() view public returns(uint256[] memory){
        return tokenIds;
    }
}

contract WizardTokenReceiver is ERC721Holder {
    WizardToken internal token;
    constructor(WizardToken _token) {
        token = _token;
    }

    uint256[] public tokenIds;
    mapping(uint256 => bool) private stolen;

    function onERC721Received(
        address sender,
        address from,
        uint256 tokenId,
        bytes memory 
    ) public virtual override returns (bytes4) {

        console.log("Came to the receiver", address(this), from);
        if (from == address(0)) {
            console.log("Returning from mint");
            token.safeMint(address(this));
        } else {
            console.log("Returning from transfer");
            stolen[tokenId] = true;
            // re-enter tokens contract
            for (uint i; i< tokenIds.length; i++) {
                if (!stolen[tokenId]) {
                    token.safeTransferFrom(sender, address(this), tokenIds[i]);
                    stolen[tokenIds[i]] = true;
                }
            }            
        }
        
        return this.onERC721Received.selector; 
    }

    function addNewToken(uint256 tokenId) public {
        tokenIds.push(tokenId);
    }
}