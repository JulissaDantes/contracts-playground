// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721OZ is ERC721 {
    constructor() ERC721("MyToken", "MTK") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function batchMint(address to, uint256[] memory tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mint(to, tokenIds[i]);
        }
    }
}
