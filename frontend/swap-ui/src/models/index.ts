import React from 'react';
import { SPLToken } from '@neonevm/token-transfer-core';
import { Connection, PublicKey, TokenAmount, Transaction } from '@solana/web3.js';
import {
  NeonAddress,
  NeonProxyRpcApi,
  ScheduledTransaction,
  ScheduledTreeAccount,
  SolanaAddress,
  SolanaNeonAccount,
  TransactionStatus
} from '@neonevm/solana-sign';
import { JsonRpcProvider } from 'ethers';

export type Props = {
  readonly children: React.ReactNode;
};

export interface CSPLToken extends SPLToken {
  chainId?: number;
  logoURI?: string;
}

export interface CTokenBalance {
  token: CSPLToken;
  balance?: TokenAmount;
  neonBalance?: bigint;
}

export interface TransactionGas {
  gasLimit: number[];
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
}

export interface SwapTokenCommonData {
  transactionGas: TransactionGas;
  proxyApi: NeonProxyRpcApi;
  provider: JsonRpcProvider;
  connection: Connection;
  solanaUser: SolanaNeonAccount;
  neonEvmProgram: PublicKey;
  tokenFrom: CSPLToken;
  tokenTo: CSPLToken;
  pancakeRouter: NeonAddress;
  pancakePair: PancakePair;
  chainId: number;
  amountFrom: number;
  amountTo: number;
  nonce: number;
}

export type SwapTokenData = Omit<SwapTokenCommonData, 'transactionGas'>;

export interface SwapTokensResponse {
  scheduledTransaction: Transaction,
  transactions: ScheduledTransaction[]
}

export interface FormState {
  id: number;
  title: string;
  isCompleted: boolean;
  signature?: string;
  status: TransactionStatus;
  method: (nonce: number) => Promise<SwapTokensResponse>;
  gas?: TransactionGas;
  data?: ScheduledTreeAccount;
}

export interface PancakePair {
  pair: NeonAddress;
  a: NeonAddress;
  b: NeonAddress;
}

export interface UITab {
  id: number;
  title: string;
  disabled: boolean;
}

export interface TokensListResponse {
  swap: any;
  tokensV1: CSPLToken[];
  tokensV2: CSPLToken[];
  airdrop?: string[];
}

export interface TransactionResponse {
  transaction: string;
  message?: string;
  payload?: any;
}

export interface TransactionStateResponse {
  lastTrx: number;
  network: SolanaEnvironment;
  token: SolanaAddress;
  wallet: SolanaAddress;
}

export const enum SolanaEnvironment {
  localnet = 'localnet',
  devnet = 'devnet',
  mainnet = 'mainnet'
}
