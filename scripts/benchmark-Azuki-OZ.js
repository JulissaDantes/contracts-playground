const { ethers } = require('hardhat');

async function main() {
    const [signer1, signer2] = await ethers.getSigners();
    const OZImpl = await ethers.getContractFactory('ERC721OZ');
    const AzukiImpl = await ethers.getContractFactory('ERC721Azuki');
    const ERC721OZEnum = await ethers.getContractFactory('ERC721OZEnum');
    //TODO include enumerable version to benchmark
    const results = [];

    // Deploy the contracts
    const erc721 = await OZImpl.deploy();
    await erc721.deployed();

    const erc721a = await AzukiImpl.deploy();
    await erc721a.deployed();

    const erc721Enum = await ERC721OZEnum.deploy();
    await erc721Enum.deployed();

    console.log(`\nBenchmarking Gas Usage for ERC-721 Implementations`);
    // mint
    let tx = await erc721.mint(signer1.address, 1); 
    let rc = await tx.wait();    
    let txa = await erc721a.mint(1); 
    let rca = await txa.wait();
    let txe = await erc721Enum.mint(signer1.address, 1); 
    let rce = await txe.wait();

    results.push({ functionName: "Mint", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString(), enumerable: rce.gasUsed.toString()});

    // mint batch
    tx = await erc721.batchMint(signer1.address, [2,3,4,5,6,7,8,9,10,11]); 
    rc = await tx.wait();    
    txa = await erc721a.mint(10); 
    rca = await txa.wait();
    txe = await erc721Enum.batchMint(signer1.address, [2,3,4,5,6,7,8,9,10,11]); 
    rce = await txe.wait();
    results.push({ functionName: "Batch mint", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString(), enumerable: rce.gasUsed.toString() });

    // transfer
    tx = await erc721.transferFrom(signer1.address, signer2.address, 1); 
    rc = await tx.wait();    
    txa = await erc721a.transferFrom(signer1.address, signer2.address, 1); 
    rca = await txa.wait();
    txe = await erc721Enum.transferFrom(signer1.address, signer2.address, 1); 
    rce = await txe.wait();
    results.push({ functionName: "Transfer", oz: rc.gasUsed.toString(), azuki: rca.gasUsed.toString(), enumerable: rce.gasUsed.toString() });

    // burn
    tx = await erc721.burn(1); 
    rc = await tx.wait();    
    txa = await erc721a.burn(1); 
    rca = await txa.wait();
    txe = await erc721Enum.burn(1); 
    rce = await txe.wait();
    results.push({ functionName: "Burn", oz: rca.gasUsed.toString(), azuki: rca.gasUsed.toString(), enumerable: rce.gasUsed.toString() });

    console.log("\nFunction Name |   oz(Normal)   |   azuki | Enumerable |  Normal vs Azuki | Enumerable vs Azuki");
    console.log("----------------------------------------------------------------------------------------------");
    for (let i = 0;i < results.length;i++) {
        console.log(
            `${results[i].functionName.padEnd(14)}|${results[i].oz.toString().padStart(16)}|${results[i].azuki.toString().padStart(9)}|${results[i].enumerable.toString().padStart(12)}|${((results[i].oz < results[i].azuki)?'OZ':'Azuki').padStart(17)}|${((results[i].enumerable < results[i].azuki)?'Enumerable':'Azuki').padStart(17)}`
        );
    }
    console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
