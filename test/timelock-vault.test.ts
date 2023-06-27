import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe.only("TimelockVault", function () {
    let instance: Contract;
    const interval = 5;
    before(async () => {
      const ContractFactory = await ethers.getContractFactory("TimelockVault");
  
      instance = await ContractFactory.deploy(interval);
      await instance.deployed();
    });
  
    it("Test contract", async function () {
      expect(await instance.interval()).to.equal(interval);
    }); 
})