import { SolanaEnvironment, SolanaTransactionSignature } from '@models';
import {
  clusterApiUrl,
  Commitment,
  Connection,
  ConnectionConfig, Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  RpcResponseAndContext,
  SendOptions,
  Signer,
  SimulatedTransactionResponse,
  Transaction
} from '@solana/web3.js';
import {
  SOLANA_BANK_DEVNET,
  SOLANA_BANK_LOCALNET, SOLANA_BANK_MAINNET,
  SOLANA_RPC_DEVNET,
  SOLANA_RPC_LOCALNET,
  SOLANA_RPC_MAINNET
} from '@environment';
import { log, logJson } from '@utils/log';
import { isValidUrl } from '@utils/url';
import bs58 from 'bs58';

export function solanaConnection(network: SolanaEnvironment, commitmentOrConfig: Commitment | ConnectionConfig = 'confirmed'): Connection {
  switch (network) {
    case SolanaEnvironment.devnet: {
      const url = isValidUrl(SOLANA_RPC_DEVNET) ? SOLANA_RPC_DEVNET : clusterApiUrl('devnet');
      return new Connection(url, commitmentOrConfig);
    }
    case SolanaEnvironment.mainnet: {
      const url = isValidUrl(SOLANA_RPC_MAINNET) ? SOLANA_RPC_MAINNET : clusterApiUrl('mainnet-beta');
      return new Connection(url, commitmentOrConfig);
    }
    case SolanaEnvironment.localnet:
      return new Connection(SOLANA_RPC_LOCALNET, commitmentOrConfig);
    default:
      return new Connection(SOLANA_RPC_LOCALNET, commitmentOrConfig);
  }
}

export function solanaBankWallet(network: SolanaEnvironment): Keypair {
  switch (network) {
    case SolanaEnvironment.devnet: {
      return Keypair.fromSecretKey(bs58.decode(SOLANA_BANK_DEVNET));
    }
    case SolanaEnvironment.mainnet: {
      return Keypair.fromSecretKey(bs58.decode(SOLANA_BANK_MAINNET));
    }
    case SolanaEnvironment.localnet:
      return Keypair.fromSecretKey(bs58.decode(SOLANA_BANK_LOCALNET));
    default:
      return Keypair.fromSecretKey(bs58.decode(SOLANA_BANK_LOCALNET));
  }
}

export async function sendSolanaTransaction(connection: Connection, transaction: Transaction, signers: Signer[],
                                            confirm = false, options?: SendOptions, solanaUrl = SOLANA_RPC_LOCALNET, name = ''): Promise<SolanaTransactionSignature> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  console.log(transaction.recentBlockhash);
  if (!transaction.recentBlockhash) {
    transaction.recentBlockhash = blockhash;
  }
  transaction.partialSign(...signers);
  const { value } = await simulateTransaction(connection, transaction);
  logJson(value.err);
  logJson(value.logs);
  // solanaTransactionLog(transaction);
  const signature = await connection.sendRawTransaction(transaction.serialize(), options);
  if (confirm) {
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  }
  log(`Transaction${name ? ` ${name}` : ''} signature: ${signature}`);
  log(`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${solanaUrl}`);
  return { blockhash, lastValidBlockHeight, signature };
}

export async function simulateTransaction(connection: Connection, transaction: Transaction, commitment: Commitment = 'confirmed'): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  if (!transaction.recentBlockhash) {
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    transaction.recentBlockhash = blockhash;
  }
  const signData = transaction.serializeMessage();
  // @ts-ignore
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString('base64');
  const config = { encoding: 'base64', commitment };
  const args = [encodedTransaction, config];

  // @ts-ignore
  const res = await connection._rpcRequest('simulateTransaction', args);
  if (res.error) {
    throw new Error(`failed to simulate transaction: ${res.error.message}`);
  }
  return res.result;
}

export async function solanaAirdrop(connection: Connection, publicKey: PublicKey, lamports: number, commitment: Commitment = 'finalized'): Promise<number> {
  let balance = await connection.getBalance(publicKey);
  if (balance < lamports) {
    const signature = await connection.requestAirdrop(publicKey, lamports);
    await connection.confirmTransaction(signature, commitment);
    balance = await connection.getBalance(publicKey);
  }
  log(`${publicKey.toBase58()} balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  return balance;
}
