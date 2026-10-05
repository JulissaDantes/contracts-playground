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

  const transport = await HIDTransport.create()

  try {
    const provider = new JsonRpcProvider(config.rpcUrl)

    const ledgerSigner = new LedgerSigner(
      transport,
      provider,
      process.env.LEDGER_PATH ?? "m/44'/60'/0'/0/0",
    )

    const ledgerAddress = await ledgerSigner.getAddress()

    console.log(`Ledger proposer: ${ledgerAddress}`)

    //
    // No Safe owner requirement here.
    // This address is a registered Safe proposer/delegate.
    //
    const protocolKit = await Safe.init({
      provider: config.rpcUrl,
      safeAddress: config.safeAddress,
    })

    const apiKit = new SafeApiKit({
      chainId: config.chainId,
      apiKey: process.env.SAFE_API_KEY!,
    })

    //
    // Important:
    // use Transaction Service's next available nonce,
    // including already-pending Safe proposals.
    //
    const nonce = await apiKit.getNextNonce(
      config.safeAddress,
    )

    console.log(`Safe nonce: ${nonce}`)

    const transactions = toSafeTransactions(batch)

    //
    // 261 transactions become ONE MultiSend Safe tx.
    //
    const safeTransaction =
      await protocolKit.createTransaction({
        transactions,
        onlyCalls: true,
        options: {
          nonce,
        },
      })

    const safeTxHash =
      await protocolKit.getTransactionHash(
        safeTransaction,
      )

    console.log(
      `Safe transaction hash: ${safeTxHash}`,
    )

    console.log(
      "\nConfirm proposal signature on Ledger...",
    )

    //
    // The Ledger proposer signs the Safe transaction
    // hash to authenticate itself to the Transaction Service.
    //
    // This is NOT an owner confirmation and does NOT
    // count toward the Safe threshold.
    //
    const ledgerSignature =
      await ledgerSigner.signMessage(
        getBytes(safeTxHash),
      )

    const proposerSignature =
      convertLedgerSignatureToSafe(
        ledgerSignature,
      )

    console.log(
      `Proposal signed by: ${ledgerAddress}`,
    )

    await apiKit.proposeTransaction({
      safeAddress: config.safeAddress,
      safeTransactionData:
        safeTransaction.data,
      safeTxHash,
      senderAddress: ledgerAddress,
      senderSignature: proposerSignature,
      origin: "OFAC restriction batch",
    })

    console.log(
      `\n✅ ${config.name} proposal submitted`,
    )

    console.log(
      `Safe Tx Hash: ${safeTxHash}`,
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