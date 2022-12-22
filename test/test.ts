import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("MyToken", function () {
  let instance: Contract;
  this.beforeAll(async () => {
    const ContractFactory = await ethers.getContractFactory("LeToken");

    instance = await ContractFactory.deploy();
    await instance.deployed();
  });

  it("Test contract", async function () {
    expect(await instance.name()).to.equal("LeToken");
  });

  it("Test reentrancy", async function () {
    const tokenOwner = await ethers.getSigner();
    const ContractFactory = await ethers.getContractFactory("TokenReceiver");
    const attacker = await ContractFactory.deploy(instance.address);
    await attacker.deployed();

    // mints 4 tokens
    await instance.mint(tokenOwner.address, 1);
    await instance.mint(tokenOwner.address, 2);
    await instance.mint(tokenOwner.address, 3);
    await instance.mint(tokenOwner.address, 4);
    //console.log(await instance.methods["safeTransferFrom(address, address, uint256)"]);
    // perform the transfer
    await instance.possibleUnsafeTransfer(tokenOwner.address, attacker.address, 1, {from: tokenOwner.address});
    // take all token due to reentrancy
    expect(await instance.balanceOf(attacker.address)).to.be.eq(1);
  });
});
