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
    const ContractFactory = await ethers.getContractFactory("TokenReceiver");
    const attacker = await ContractFactory.deploy();
    await attacker.deployed();

    // mints 5 tokens
    // perform the transfer
    // take all token due to reentrancy
  });
});
