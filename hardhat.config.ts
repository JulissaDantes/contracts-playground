import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config({ path: ".env" });

const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const SEPOLIA_URL = process.env.INFURA_SEPOLIA;
const test_account = process.env.SEPOLIA_PK!;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  networks: {
    goerli: {
      url: QUICKNODE_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [test_account],
    },
    zkEVM: {
      url: 'https://rpc.public.zkevm-test.net',
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;
