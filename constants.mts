import {
  initEccLib,
  networks,
} from "bitcoinjs-lib";
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { BIP32Factory } from 'bip32';

initEccLib(ecc)

export const NETWORK = networks.bitcoin
export const BATCH_SIZE = 700
export const OUT_FILE = 'results.json'

export const BIP_32 = BIP32Factory(ecc);
export const EC_PAIR = ECPairFactory(ecc);
export const MEMPOOL_URL = `https://mempool.space/${(NETWORK === networks.bitcoin ? '' : 'testnet/')}api`
