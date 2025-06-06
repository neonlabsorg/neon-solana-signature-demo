import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT!;
const SOLANA_BANK_LOCALNET = process.env.SOLANA_BANK_LOCALNET!;
const SOLANA_BANK_DEVNET = process.env.SOLANA_BANK_DEVNET!;
const SOLANA_BANK_MAINNET = process.env.SOLANA_BANK_MAINNET!;
const SOLANA_WALLET = process.env.SOLANA_WALLET!;
const SOLANA_RPC_MAINNET = process.env.SOLANA_RPC_MAINNET!;
const SOLANA_RPC_DEVNET = process.env.SOLANA_RPC_DEVNET!;
const SOLANA_RPC_LOCALNET = process.env.SOLANA_RPC_LOCALNET!;
const TRANSACTION_INTERVAL = process.env.TRANSACTION_INTERVAL!;
const AIRDROP_LIMIT = process.env.AIRDROP_LIMIT!;

export {
  SERVER_PORT,
  TRANSACTION_INTERVAL,
  AIRDROP_LIMIT,
  SOLANA_BANK_LOCALNET,
  SOLANA_BANK_DEVNET,
  SOLANA_BANK_MAINNET,
  SOLANA_WALLET,
  SOLANA_RPC_MAINNET,
  SOLANA_RPC_DEVNET,
  SOLANA_RPC_LOCALNET
};
