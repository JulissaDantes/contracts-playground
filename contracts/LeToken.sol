// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

contract LeToken is ERC721 {
    constructor() ERC721("LeToken", "LTK") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function possibleUnsafeTransfer(address from, address to, uint256 tokenId) public {
        console.log("Came to the transfer with to:", from, to, msg.sender);
        safeTransferFrom(from, to, tokenId);
    }
}
