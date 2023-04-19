// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract kinger {
  function claimKingship(address payable _to) public payable {
        (bool sent,) = _to.call{value:0}("");
        require(sent, "Failed to send value!");
    }
}