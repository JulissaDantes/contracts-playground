const { ethers } = require('hardhat');

async function main() {
    const OZImpl = await ethers.getContractFactory('ERC721OZ');
    const AzukiImpl = await ethers.getContractFactory('ERC721Azuki');
    const results = [];

    // Deploy the contracts
    const erc721 = await OZImpl.deploy();
    await erc721.deployed();

    const erc721a = await AzukiImpl.deploy();
    await erc721a.deployed();

    // Perform benchmark transactions (e.g., mint tokens, transfer tokens, etc.)

    console.log(`Benchmarking Gas Usage for ERC-721 Implementations`);
    // mint
    let tx = await erc721.mint(); // Replace with your contract's functions
    await tx.wait();    
    let txa = await erc721a.mint(); // Replace with your contract's functions
    await txa.wait();

    results.push({ functionName: "Mint", oz: tx.gasUsed.toString(), azuki: txa.gasUsed.toString() });

    // mint batch
    tx = await erc721.someFunction(); // Replace with your contract's functions
    await tx.wait();    
    txa = await erc721a.someFunction(); // Replace with your contract's functions
    await txa.wait();
    results.push({ functionName: "Batch mint", oz: tx.gasUsed.toString(), azuki: txa.gasUsed.toString() });

    // transfer
    tx = await erc721.someFunction(); // Replace with your contract's functions
    await tx.wait();    
    txa = await erc721a.someFunction(); // Replace with your contract's functions
    await txa.wait();
    results.push({ functionName: "Transfer", oz: tx.gasUsed.toString(), azuki: txa.gasUsed.toString() });

    // burn
    tx = await erc721.someFunction(); // Replace with your contract's functions
    await tx.wait();    
    txa = await erc721a.someFunction(); // Replace with your contract's functions
    await txa.wait();
    results.push({ functionName: "Burn", oz: tx.gasUsed.toString(), azuki: txa.gasUsed.toString() });

    // burn batch
    tx = await erc721.someFunction(); // Replace with your contract's functions
    await tx.wait();    
    txa = await erc721a.someFunction(); // Replace with your contract's functions
    await txa.wait();
    results.push({ functionName: "Batch burn", oz: tx.gasUsed.toString(), azuki: txa.gasUsed.toString() });

    console.log("Function Name |   oz   |   azuki ");
    console.log("----------------------------");
    for (let i = 0;i < results.length;i++) {
        console.log(
            `${functionName.padEnd(13)}|${oz.toString().padStart(7)}|${azuki.toString().padStart(7)}`
        );
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
