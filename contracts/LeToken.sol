// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract LeToken is ERC721 {
    constructor() ERC721("LeToken", "LTK") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
