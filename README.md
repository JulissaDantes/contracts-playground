# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a contract generated by [OpenZeppelin Wizard](https://wizard.openzeppelin.com/), a test for that contract, and a script that deploys that contract.

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