# Experimental Hardhat Project
 This is the project I use to test cases that intrigue me. Some file are from other repos but I keep them here. Its a typescript project but you can find js files.

## Installing dependencies

```
npm install
```

## Testing the contract

```
npm test
```

## Deploying the contract

You can target any network from your Hardhat config using:

```
npx hardhat run --network <network-name> scripts/deploy.ts
```

### Experiments:
## Can ERC721 safeTransferFrom suffer from a reentrancy attack?
Yes, but it would not be a successful attack since you send the `tokenId` and not an amount of tokens to transfers. Therefore, when it re enters the transfer function the transfer of said `tokenId` was already done it will revert with: `reverted with reason string 'ERC721: transfer from incorrect owner'`.

## Can ERC721 safeMint suffer from a reentrancy attack?
Yes, if the token pattern is known, e.g. each token is the last tokenId + 1, a user can call `safeMint` or the minting function the contract is using that calls `_safeMint` with a different token everytime from the `onERC721Received` function. Since thats a private function is not like an external contract can call it, but if the contract inheriting it exposes it on a public function that's here the real reentrancy issue is. e.g: https://blocksecteam.medium.com/when-safemint-becomes-unsafe-lessons-from-the-hypebears-security-incident-2965209bda2a

## Benchmark results for Azuki and OZ Enumerable
| Function Name | oz(Normal) | azuki | Enumerable | Normal vs Azuki | Enumerable vs Azuki |
| --- | --- | --- | --- | --- | --- |
| Mint | 69478 | 90654 | 141416 | OZ | Azuki |
| Batch mint | 286984 | 73923 | 1189746 | Azuki | Azuki |
| Transfer | 60996 | 84861 | 93024 | OZ | Azuki |
| Burn | 29620 | 61123 | 54872 | OZ | Enumerable |

These results were taken with the compiler optimizer being on. The Azuki implementation resulted in a much efficient gas usage during batch minting, but during transfers th difference was minimal, and during burn operations the enumerable token was better at gas usage, so if a project main concern is the batch minting function I would recommend the Azuki token implementation. Regardless the Oz normal implementation resulted in betters gas usage overall therefore I would only use enumerable tokens if it's extremely necessary only.

## Projects
- [ ] Deploy a different FORTA bot to practice
- [ ] A project for banks to use, have ERC6551 token, token bound account, where to mint the user request mint with their id then we use chainlink to call the service checking the ids validity if its valid it mints an nft to the address and the nft wallet is what the users can withdraw from in the bank.Maybe check what worldcoin offers for this
- [ ] Book club governance system
- [ ] cross chain bridge demo tutorial
- [ ] Make the cryptomyriad deploy an upgradeable system that upgrades all instances with a beacon proxy
- [X] Rust project TBD
- [ ] Missinformation-proof content creation platform where writers must stake some tokens to publish and the articles have a time where validators vote on the veracity of the content and earn a reward if they spot a fraudulent author.
- [ ] Contribution foundry to determine base on the function line which state changes should be tested, basically it identify what should it test for after the function runs.
- [ ] Train an LLM on foundry test to be able to auto generate foundry test for a given contract.
- [ ] Contribute to the solidity compiler to auto compile the storage variable in the most storage optimal order, see how this would work in upgradeability maybe having a flag for that.
- [ ] A contribution to slither to better check the actual risk of a reentrancy attack, currently alerts if there is the risk ignoring things like a reentrancy guard.
- [ ] Timelock based withdrawls that alert the user it approved a withdrawl
- [X] Benchmark gas usage in normal erc721 functions and erc721a
- [X] Account abstraction
- [ ] Decentralized relayer, check filecoin/IPC relayer
- [ ] An app to scan QR codes simulate their transaction before signing anything(like a mint buttom) and check that it wont drain the funds in the wallet is performing the transaction to.
- [ ] A protocol that interfaces between web2 pages and a crypto wallet allowing user to pay with their crypto while the web page gets its money in fiat, the protocol is in a sense an exchange and charges for each transaction
