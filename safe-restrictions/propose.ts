import "dotenv/config"
import fs from "node:fs"

import Safe from "@safe-global/protocol-kit"
import SafeApiKit from "@safe-global/api-kit"

import {
  MetaTransactionData,
  OperationType,
} from "@safe-global/types-kit"

import { JsonRpcProvider, getBytes } from "ethers"

import { LedgerSigner } from "@ethers-ext/signer-ledger"
import HIDTransport from "@ledgerhq/hw-transport-node-hid"

type BatchFile = {
  chainId: string
  transactions: {
    to: string
    value: string
    data: string
    operation: number
  }[]
}

type ChainConfig = {
  name: string
  chainId: bigint
  rpcUrl: string
  safeAddress: string
  file: string
}

const configs: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    chainId: 8453n,
    rpcUrl: process.env.BASE_RPC_URL!,
    safeAddress: process.env.BASE_SAFE_ADDRESS!,
    file: "./base-restrict.json",
  },

  polygon: {
    name: "Polygon",
    chainId: 137n,
    rpcUrl: process.env.POLYGON_RPC_URL!,
    safeAddress: process.env.POLYGON_SAFE_ADDRESS!,
    file: "./polygon-restrict.json",
  },

  bnb: {
    name: "BNB Chain",
    chainId: 56n,
    rpcUrl: process.env.BNB_RPC_URL!,
    safeAddress: process.env.BNB_SAFE_ADDRESS!,
    file: "./bnb-restrict.json",
  },
}

function loadBatch(file: string): BatchFile {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function toSafeTransactions(batch: BatchFile): MetaTransactionData[] {
  return batch.transactions.map((tx) => ({
    to: tx.to,
    value: tx.value,
    data: tx.data,
    operation:
      tx.operation === 1
        ? OperationType.DelegateCall
        : OperationType.Call,
  }))
}

/**
 * Ledger signMessage() produces an EIP-191 / eth_sign signature.
 *
 * Safe expects eth_sign signatures with:
 *
 *     vSafe = vEthereum + 4
 *
 * So:
 *     27 -> 31
 *     28 -> 32
 */
function convertLedgerSignatureToSafe(signature: string): string {
  if (!signature.startsWith("0x") || signature.length !== 132) {
    throw new Error(`Unexpected signature: ${signature}`)
  }

  const body = signature.slice(2)

  const rs = body.slice(0, 128)
  let v = parseInt(body.slice(128, 130), 16)

  // Some signing libraries return 0/1 instead of 27/28.
  if (v === 0 || v === 1) {
    v += 27
  }

  if (v !== 27 && v !== 28) {
    throw new Error(`Unexpected Ledger v value: ${v}`)
  }

  const safeV = v + 4

  return `0x${rs}${safeV.toString(16).padStart(2, "0")}`
}

async function propose(config: ChainConfig) {
  console.log(`\n=== ${config.name} ===`)

  const batch = loadBatch(config.file)

  if (BigInt(batch.chainId) !== config.chainId) {
    throw new Error(
      `Wrong batch chainId. JSON=${batch.chainId}, expected=${config.chainId}`,
    )
  }

  console.log(`Safe: ${config.safeAddress}`)
  console.log(`Transactions: ${batch.transactions.length}`)

  if (batch.transactions.length !== 261) {
    throw new Error(
      `Expected 261 restriction calls, found ${batch.transactions.length}`,
    )
  }

  //
  // Connect to Ledger
  //
  const transport = await HIDTransport.create()

  try {
    const provider = new JsonRpcProvider(config.rpcUrl)

    const ledgerSigner = new LedgerSigner(
      transport,
      provider,
      process.env.LEDGER_PATH ?? "m/44'/60'/1'/0/0",
    )

    const ledgerAddress = await ledgerSigner.getAddress()

    console.log(`Ledger signer: ${ledgerAddress}`)

    //
    // Initialize Protocol Kit.
    //
    // We only give Safe the owner's address here.
    // The Ledger signing itself happens below.
    //
    const protocolKit = await Safe.init({
      provider: config.rpcUrl,
      signer: ledgerAddress,
      safeAddress: config.safeAddress,
    })

    //
    // Verify Ledger is actually an owner of this Safe.
    //
    const owners = await protocolKit.getOwners()

    const isOwner = owners.some(
      (owner) =>
        owner.toLowerCase() === ledgerAddress.toLowerCase(),
    )

    if (!isOwner) {
      throw new Error(
        `${ledgerAddress} is not an owner of Safe ${config.safeAddress}`,
      )
    }

    console.log("Ledger is a Safe owner ✓")

    //
    // Turn the 261 JSON transactions into ONE Safe multisend.
    //
    const transactions = toSafeTransactions(batch)

    const safeTransaction =
      await protocolKit.createTransaction({
        transactions,
        onlyCalls: true,
      })

    //
    // Compute the Safe transaction hash.
    //
    const safeTxHash =
      await protocolKit.getTransactionHash(safeTransaction)

    console.log(`Safe transaction hash: ${safeTxHash}`)

    //
    // Ledger signs the 32-byte Safe transaction hash.
    //
    console.log(
      "\nConfirm the Safe proposal on your Ledger...",
    )

    const ledgerSignature =
      await ledgerSigner.signMessage(
        getBytes(safeTxHash),
      )

    //
    // Convert normal eth_sign v=27/28 into
    // Safe ETH_SIGN v=31/32.
    //
    const safeSignature =
      convertLedgerSignatureToSafe(
        ledgerSignature,
      )

    console.log("Ledger signature obtained ✓")

    //
    // Safe Transaction Service client.
    //
    // chainId determines which network's Safe service
    // receives this proposal.
    //
    const apiKit = new SafeApiKit({
      chainId: config.chainId,
      apiKey: process.env.SAFE_API_KEY!,
    })

    //
    // Submit the ONE multisend proposal.
    //
    await apiKit.proposeTransaction({
      safeAddress: config.safeAddress,

      safeTransactionData:
        safeTransaction.data,

      safeTxHash,

      senderAddress: ledgerAddress,

      senderSignature: safeSignature,

      origin: "OFAC restriction batch",
    })

    console.log(
      `✅ ${config.name} proposal submitted`,
    )
  } finally {
    await transport.close()
  }
}

async function main() {
  const network = process.argv[2]

  if (
    !network ||
    !["base", "polygon", "bnb"].includes(network)
  ) {
    console.error(
      "Usage: npx tsx propose.ts base|polygon|bnb",
    )

    process.exit(1)
  }

  await propose(configs[network])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})