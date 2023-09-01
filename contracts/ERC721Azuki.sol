// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";

/*
*   This contract is for benchmark purposes only. DO NOT DEPLOY. 
*/
contract ERC721Azuki is ERC721A {
    constructor() ERC721A("Azuki", "AZUKI") {}

    function mint(uint256 quantity) external payable {
        // `_mint`'s second argument now takes in a `quantity`, not a `tokenId`.
        _mint(msg.sender, quantity);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}
