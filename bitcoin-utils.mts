import {
  payments,
  crypto,
  Psbt,
  networks,
  Signer,
} from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371.js";
import * as bip39 from 'bip39';
import { BIP32Interface } from 'bip32';
import { safeFetch } from "./broadcast.js";
import { BIP_32, MEMPOOL_URL, NETWORK } from "./constants.mjs";

export type BaseInput = {
  hash: string
  index: number
  value?: number,
  key: Signer
}

export type BaseOutput = {
  address: string,
  value: number
}

export function loadKey(mnemonic: string, account: number, address: string) {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const node = BIP_32.fromSeed(seed)
  const chainCode = NETWORK == networks.bitcoin ? '0' : '1'
  for (let i = 0;; i++) {
    let key = tweak(node.derivePath(`m/86'/${chainCode}'/${account}'/0/${i}`))
    if (payments.p2tr({ pubkey: toXOnly(key.publicKey), network: NETWORK }).address === address) {
      return key
    }

    key = tweak(node.derivePath(`m/86'/${chainCode}'/${account}'/1/${i}`))
    if (payments.p2tr({ pubkey: toXOnly(key.publicKey), network: NETWORK }).address === address) {
      return key
    }

    if (i >= 1000) {
      console.error(`Unable to find wallet descriptor with address ${address}`)
      process.exit(0)
    }
  }
}

function tweak(keyPair: BIP32Interface, hash: Buffer | undefined = undefined) {
  const pubKey = toXOnly(keyPair.publicKey)
  return keyPair.tweak(crypto.taggedHash('TapTweak', Buffer.concat(hash === undefined ? [pubKey] : [pubKey, hash])))
}

export async function createTransaction(
  baseInputs: BaseInput[], outputs: BaseOutput[], feeRate: number, changeAddress: string
) {
  const promises = baseInputs.map(async (x) => {
    const value = x.value ?? await getUtxoValue(x.hash, x.index)
    const p2pktr = payments.p2tr({ pubkey: toXOnly(x.key.publicKey) })
    return {
      hash: x.hash,
      index: x.index,
      sequence: 0xFFFFFFFD,
      tapInternalKey: toXOnly(x.key.publicKey),
      witnessUtxo: { value, script: p2pktr.output }
    }
  })
  const inputs = await Promise.all(promises)

  const totalInputValue = inputs.reduce((sum, x) => sum + x.witnessUtxo.value, 0)
  const totalOutputValue = outputs.reduce((sum, x) => sum + x.value, 0)
  if (totalInputValue < totalOutputValue) {
    throw Error(`Not enough funds. Attempting to create transaction of value ${totalOutputValue} 
            with UTXO of value ${totalInputValue}`)
  }
  const change = {
    address: changeAddress,
    value: totalInputValue - totalOutputValue
  }

  const keys = baseInputs.map(x => x.key)
  const testTransaction = createRawTransaction(keys, inputs, [...outputs, change])
  const fee = Math.round(testTransaction.extractTransaction().virtualSize() * feeRate)
  change.value -= fee
  if (change.value < 0) {
    throw Error(`Not enough funds. Attempting to create transaction of value ${totalOutputValue + fee} 
            with UTXO of value ${totalInputValue}`)
  }
  return createRawTransaction(keys, inputs, [...outputs, change])
}

export async function getUtxoValue(txid: string, index: number) {
  const response = await safeFetch(`${MEMPOOL_URL}/tx/${txid}`)
  const transaction = JSON.parse(response)
  return transaction.vout[index].value as number
}

export function createRawTransaction(keys: Signer[], inputs: any, outputs: BaseOutput[]) {
  const psbt = new Psbt({ network: NETWORK }).addInputs(inputs).addOutputs(outputs)
  for (let i = 0; i < keys.length; i++) {
    psbt.signInput(i, keys[i])
  }
  psbt.finalizeAllInputs()
  return psbt
}