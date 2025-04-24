import { TransactionSignature } from '@solana/web3.js';

export interface CSPLToken {
  address: string;
  address_spl: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface Addresses {
  swap: any;
  airdrop: string[];
  tokensV1: CSPLToken[];
  tokensV2: CSPLToken[];
}

export interface CurveAddresses {
  contracts: string[];
  airdrop: string[];
  tokens: CSPLToken[];
}

export const enum SolanaEnvironment {
  curvestand = 'curvestand',
  localnet = 'localnet',
  devnet = 'devnet',
  mainnet = 'mainnet'
}

export interface SolanaTransactionSignature {
  signature: TransactionSignature;
  blockhash?: string;
  lastValidBlockHeight?: number;
}

export interface TransactionResponse {
  transaction: string;
}
