// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

// This is a mock contract to test a specific behavior, is not a deploy ready contract since it contains security issues.
contract LeToken is ERC721 {
    mapping(address => bool) internal minters;
    uint internal totalSupply;

    constructor() ERC721("LeToken", "LTK") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
        totalSupply++;
    }

    function mintWhiteListedNFTs(address to, uint256 numTokens) public {
        console.log("Starting loop");
        require(minters[to], "Not whitelisted");
        for (uint i = 0; i < numTokens; i++) {
            _safeMint(to, totalSupply + 1);
            totalSupply++;
        }
        minters[to] = false;
    }

    function possibleUnsafeTransfer(address from, address to, uint256 tokenId) public {
        console.log("Came to the transfer with to:", from, to, msg.sender);
        safeTransferFrom(from, to, tokenId);
    }

    function whitelist(address whitelisted) public {
        minters[whitelisted] = true;
    }

    function safeMint(address to, uint256 tokenId) external virtual {
        _safeMint(to, tokenId, "");
    }
}
