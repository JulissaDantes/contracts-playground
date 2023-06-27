# Sample Hardhat Project
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

## Projects
[ ] Deploy a different FORTA bot to practice
[ ] Book club governance system
[ ] cross chain bridge demo tutorial
[ ] Make the cryptomyriad deploy an upgradeable system that upgrades all instances with a beacon proxy
[ ] Rust project
[ ] Timelock based withdrawls that alert the user it approved a withdrawl
