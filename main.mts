import { BaseInput, BaseOutput, createTransaction, getUtxoValue, loadKey } from "./bitcoin-utils.mjs"
import { safeFetch } from "./broadcast.js"
import { BATCH_SIZE, MEMPOOL_URL, OUT_FILE } from "./constants.mjs"
import { loadCsv } from "./csv-loader.mjs"
import fs from 'fs'
import promptGenerator from 'prompt-sync'

const MNEMONIC = "INSERT MNEMONIC HERE"
const ACCOUNT = 0
const INSCRIPTIONS_ADDRESS = "INSERT INSCRIPTIONS ADDRESS HERE"
const FUNDS_ADDRESS = "INSERT FUNDS ADDRESS HERE"
const FUNDS_SATPOINT = "INSERT FUNDS SATPOINT HERE"
const INPUT_FILE = 'ids.csv'
const FEE_RATE = 10
const BATCH = 0

const prompt = promptGenerator()

let completedBatches: Record<string, string> = {}
if (fs.existsSync(OUT_FILE)) {
  completedBatches = JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8'))
}

if (completedBatches[BATCH.toString()] != null) {
  console.warn(`You already broadcasted batch ${BATCH} with transaction: ${completedBatches[BATCH.toString()]}.\nContinuing will likely fail as you have probably already sent the UTXO's in this batch.\nIf you are transfering a new set of inscriptions, please delete the ${OUT_FILE} file to reset the script.`)
  const response = prompt('Do you want to continue? (Y/N)')
  if (response.toLowerCase() !== 'y') {
    process.exit()
  }
}

const inscriptionsKey = loadKey(MNEMONIC, ACCOUNT, INSCRIPTIONS_ADDRESS)
const fundsKey = loadKey(MNEMONIC, ACCOUNT, FUNDS_ADDRESS)
const data = (await loadCsv(INPUT_FILE)).slice(BATCH_SIZE * BATCH, BATCH_SIZE * (BATCH + 1))

const [hash, idx] = data[0].id.split('i')
const padding = await getUtxoValue(hash, parseInt(idx))

const inputs: BaseInput[] = []
const outputs: BaseOutput[] = []
for (const { address, id } of data) {
  const [hash, idx] = id.split('i')
  inputs.push({
    hash,
    index: parseInt(idx),
    value: padding,
    key: inscriptionsKey
  })

  outputs.push({
    address,
    value: padding
  })
}

const [feeHash, feeIdx] = FUNDS_SATPOINT.split(':')
inputs.push({
  hash: feeHash,
  index: parseInt(feeIdx),
  key: fundsKey
})

const tx = await createTransaction(inputs, outputs, FEE_RATE, FUNDS_ADDRESS)

console.log(`Batch: ${BATCH}`)
console.log(`Inscriptions to transfer: ${data.length}`)
console.log(`Transaction size: ${tx.extractTransaction().virtualSize()}vB`)
console.log(`Fee: ${tx.getFee()}sats`)

const response = prompt('Are you sure you want to broadcast this transaction? (Y/N)')
if (response.toLowerCase() !== 'y') {
  process.exit()
}

const fetchResponse = await safeFetch(`${MEMPOOL_URL}/tx`, { 
  body: tx.extractTransaction().toHex(), 
  method: 'POST' 
})
console.log(`Broadcasted: ${fetchResponse}`)
completedBatches[BATCH.toString()] = tx.extractTransaction().getId()
fs.writeFileSync(OUT_FILE, JSON.stringify(completedBatches, undefined, 2))
