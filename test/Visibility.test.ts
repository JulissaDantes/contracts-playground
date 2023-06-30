import { Contract } from "ethers";

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Visibility', function () {
  let visibility: Contract;

  beforeEach(async function () {
    const Visibility = await ethers.getContractFactory('Visibility');
    visibility = await Visibility.deploy();
    await visibility.deployed();
  });

  it('should compare gas consumption of barPublic2 vs barPublic', async function () {
    const one = { x: 10, y: true };

    const barPublic2Tx = await (await visibility.barPublic2(one)).wait();
    const barPublicTx = await ( await visibility.barPublic(one)).wait();
    console.log("case1:",barPublic2Tx.gasUsed.toNumber(),"case2",barPublicTx.gasUsed.toNumber())
    expect(barPublic2Tx.gasUsed.toNumber()).to.be.greaterThan(barPublicTx.gasUsed.toNumber());
  });
});
