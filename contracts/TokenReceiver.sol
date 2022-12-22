// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract TokenReceiver is ERC721Holder {
    IERC721 internal token;
    constructor(IERC721 _token) {
        token = _token;
    }

    function onERC721Received(
        address sender,
        address,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
       // re-enter tokens contract
       token.safeTransferFrom(sender, address(0), tokenId, data);
       return this.onERC721Received.selector; 
    }
}