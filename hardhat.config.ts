import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config({ path: ".env" });

const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

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
  },
};

export default config;
