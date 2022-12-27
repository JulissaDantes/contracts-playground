import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("MyToken", function () {
  let instance: Contract;
  let attacker: Contract;
  before(async () => {
    const ContractFactory = await ethers.getContractFactory("LeToken");

    instance = await ContractFactory.deploy();
    await instance.deployed();

    const ContractFactory2 = await ethers.getContractFactory("TokenReceiver");
    attacker = await ContractFactory2.deploy(instance.address);
    await attacker.deployed();
  });

  it("Test contract", async function () {
    expect(await instance.name()).to.equal("LeToken");
  });

  it("Test reentrancy in transfers", async function () {
    const tokenOwner = await ethers.getSigner();

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

  it("Test reentrancy in minting", async function () {
    //Lets say accounts are whitelisted to mint but only once
    await instance.whitelist(attacker.address);
    // perform the minting
    await instance.mintWhiteListedNFTs(attacker.address, 3);
    //await instance.possibleUnsafeTransfer(tokenOwner.address, attacker.address, 1, {from: tokenOwner.address});
    // take all token due to reentrancy
    expect(await instance.balanceOf(attacker.address)).to.be.eq(3);
  });

  it("Test reentrancy in wizard token", async function () {
    const tokenOwner = await ethers.getSigner();
    const ContractFactory = await ethers.getContractFactory("WizardToken");
    const wizardToken = await ContractFactory.deploy();
    await wizardToken.deployed();

    const WContractFactory = await ethers.getContractFactory("WizardTokenReceiver");
    const wattacker = await WContractFactory.deploy(wizardToken.address);
    await wattacker.deployed();

    await wizardToken.safeMint(wattacker.address, {from: tokenOwner.address});
  });
});
