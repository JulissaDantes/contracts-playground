const { ethers } = require('hardhat');

async function main() {
    const [signer1, signer2] = await ethers.getSigners();
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
    let tx = await erc721.mint(signer1.address, 1); 
    let rc = await tx.wait();    
    let txa = await erc721a.mint(1); 
    let rca = await txa.wait();

    results.push({ functionName: "Mint", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString() });

    // mint batch
    tx = await erc721.batchMint(signer1.address, [2,3,4,5,6,7,8,9,10,11]); 
    rc = await tx.wait();    
    txa = await erc721a.mint(10); 
    rca = await txa.wait();
    results.push({ functionName: "Batch mint", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString() });

    // transfer
    tx = await erc721.transferFrom(signer1.address, signer2.address, 1); 
    rc = await tx.wait();    
    txa = await erc721a.transferFrom(signer1.address, signer2.address, 1); 
    rca = await txa.wait();
    results.push({ functionName: "Transfer", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString() });
/*
    // burn
    tx = await erc721.someFunction(); 
    rc = await tx.wait();    
    txa = await erc721a.someFunction(); 
    rca = await txa.wait();
    results.push({ functionName: "Burn", oz: rca.gasUsed.toString(), azuki: rca.gasUsed.toString() });

    // burn batch
    tx = await erc721.someFunction(); 
    rc = await tx.wait();    
    txa = await erc721a.someFunction(); 
    rca = await txa.wait();
    results.push({ functionName: "Batch burn", oz: rca.gasUsed.toString(), azuki: rca.gasUsed.toString() });
*/
    console.log("Function Name |   oz(Normal)   |   azuki ");
    console.log("----------------------------");
    for (let i = 0;i < results.length;i++) {
        console.log(
            `${results[i].functionName.padEnd(13)}|${results[i].oz.toString().padStart(7)}|${results[i].azuki.toString().padStart(7)}`
        );
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
