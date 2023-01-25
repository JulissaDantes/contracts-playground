import { expect } from "chai";
import { Contract, utils } from "ethers";
import { hexZeroPad } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe.only("Events", function () {
  let instance: Contract;
    before(async () => {
    const ContractFactory = await ethers.getContractFactory("Evener");

    instance = await ContractFactory.deploy();
    await instance.deployed();

  });

  it("Reads into events", async () => {
    // Filtering by user
    const filter = {
        address: instance.address,
        topics: [
            utils.id("LogRewardPaidByPool(uint256,address,uint256)"),
            hexZeroPad(instance.address, 32)
        ]
    };
    console.log(";enma");
    await instance.on("LogRewardPaidByPool", async (assetId, user, amount) => {
        await assetId;
        console.log(assetId, user, amount);
    })
    const tx = await instance.foo1();
    const result = await tx.wait();
    const event = result.events.filter((x: { event: string; }) => x.event == "LogRewardPaidByPool").pop();
    console.log("post;enma", event.args);
    await instance.on(filter, async (assetId, user, amount) => {
      await assetId;
      console.log(assetId, user, amount);
  })
  });
});