import {
  claimTransactionData,
  erc20ForSPLContract,
  neonWrapper2Contract
} from '@neonevm/token-transfer-ethers';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  createApproveInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync
} from '@solana/spl-token';
import {
  createScheduledNeonEvmMultipleTransaction,
  EstimatedScheduledGasPayData,
  EstimateScheduledTransaction,
  logJson,
  MultipleTransactions,
  NeonAddress,
  NeonProxyRpcApi,
  neonWalletProgramAddress,
  NO_CHILD_INDEX,
  ScheduledTransaction,
  SolanaNeonAccount
} from '@neonevm/solana-sign';
import {
  authAccountAddress,
  erc20Abi,
  neonWrapper2Abi,
  SPLToken,
  toFullAmount
} from '@neonevm/token-transfer-core';
import { Contract, Interface, JsonRpcProvider, parseUnits } from 'ethers';
import { pancakeSwapRouterAbi } from '../data/pancakeSwapRouter';
import {
  CSPLToken,
  PancakePair,
  SwapTokenCommonData,
  SwapTokenData,
  SwapTokensResponse,
  TransactionGas
} from '../models';
import { Big } from 'big.js';
import { pancakeSwapPairAbi } from '../data/pancakeSwapPair';

export async function estimateScheduledGas(proxyApi: NeonProxyRpcApi, data: EstimatedScheduledGasPayData): Promise<TransactionGas> {
  let { maxPriorityFeePerGas, maxFeePerGas } = await proxyApi.getMaxFeePerGas();
  let gasLimit = data.transactions.map(_ => 1e7);
  try {
    const { result, error } = await proxyApi.estimateScheduledGas(data);
    logJson(error);
    if (result) {
      logJson(result);
      maxFeePerGas = parseInt(result.maxFeePerGas, 16);
      maxPriorityFeePerGas = parseInt(result.maxPriorityFeePerGas, 16);
      gasLimit = result.gasList.map(i => parseInt(i, 16));
    }
  } catch (e) {
    console.log(e);
  }
  return { gasLimit, maxFeePerGas, maxPriorityFeePerGas };
}

export function transferTokenToNeonTransactionData(data: SwapTokenData): EstimateScheduledTransaction {
  const {
    solanaUser,
    tokenFrom,
    amountFrom
  } = data;
  const fullAmount = parseUnits(amountFrom.toString(), tokenFrom.decimals);
  const tokenATA = getAssociatedTokenAddressSync(new PublicKey(tokenFrom.address_spl), solanaUser.publicKey);
  const climeData = claimTransactionData(tokenATA, solanaUser.neonWallet, fullAmount);

  return {
    from: solanaUser.neonWallet,
    to: tokenFrom.address,
    data: climeData
  };
}

export function approveTokenTransactionData(data: SwapTokenData): EstimateScheduledTransaction {
  const {
    solanaUser,
    tokenFrom,
    amountFrom
  } = data;

  return {
    from: solanaUser.neonWallet,
    to: tokenFrom.address,
    data: erc20ForSPLContract().encodeFunctionData('approve', [solanaUser.neonWallet, parseUnits(amountFrom.toString(), tokenFrom.decimals)])
  };
}

export function approveTokensForSwapTransactionData(data: SwapTokenData): EstimateScheduledTransaction {
  const {
    pancakeRouter,
    amountFrom,
    tokenFrom,
    solanaUser
  } = data;

  return {
    from: solanaUser.neonWallet,
    to: tokenFrom.address,
    data: erc20ForSPLContract().encodeFunctionData('approve', [pancakeRouter, parseUnits(amountFrom.toString(), tokenFrom.decimals)])
  };
}

export function pancakeSwapTransactionData(data: SwapTokenData): EstimateScheduledTransaction {
  const {
    amountFrom,
    tokenFrom,
    tokenTo,
    solanaUser,
    pancakeRouter
  } = data;
  const pancaceSwapInterface = new Interface(pancakeSwapRouterAbi);
  const fullAmountFrom = toFullAmount(amountFrom, tokenFrom.decimals);
  const deadline = Math.round((Date.now()) / 1e3) + 10 * 60;
  const swapData = pancaceSwapInterface.encodeFunctionData('swapExactTokensForTokens', [fullAmountFrom, 0, [tokenFrom.address, tokenTo.address], solanaUser.neonWallet, deadline]);
  return {
    from: solanaUser.neonWallet,
    to: pancakeRouter,
    data: swapData
    // childTransaction: toBeHex(index)
  };
}

export async function transferTokenToSolanaTransactionData(data: SwapTokenData): Promise<EstimateScheduledTransaction> {
  const {
    solanaUser,
    tokenFrom,
    tokenTo,
    amountFrom,
    provider,
    pancakePair,
    pancakeRouter
  } = data;
  const contract = new Contract(tokenTo.address, erc20Abi, provider);
  const balance = await contract.balanceOf(solanaUser.neonWallet);
  let amount = await estimateSwapAmount(provider, [tokenFrom, tokenTo], amountFrom.toString(), pancakeRouter, pancakePair);
  if (balance > BigInt(0)) {
    amount = amount + balance;
  }
  const tokenMint = new PublicKey(tokenTo.address_spl);
  const ata = getAssociatedTokenAddressSync(tokenMint, solanaUser.publicKey);
  const transferSolanaData = erc20ForSPLContract().encodeFunctionData('transferSolana', [ata.toBuffer(), amount]);

  return {
    from: solanaUser.neonWallet,
    to: tokenTo.address,
    data: transferSolanaData
  };
}

export function transferTokenToNeonTransaction(index: number, data: SwapTokenCommonData): [ScheduledTransaction, TransactionInstruction] {
  const {
    solanaUser,
    tokenFrom,
    chainId,
    amountFrom,
    nonce,
    neonEvmProgram,
    transactionGas
  } = data;

  const fullAmount = toFullAmount(amountFrom, tokenFrom.decimals);
  const tokenATA = getAssociatedTokenAddressSync(new PublicKey(tokenFrom.address_spl), solanaUser.publicKey);
  const climeData = claimTransactionData(tokenATA, solanaUser.neonWallet, fullAmount);

  const transaction = new ScheduledTransaction({
    index: index,
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: tokenFrom.address,
    callData: climeData,
    chainId: chainId,
    gasLimit: transactionGas.gasLimit[index],
    maxFeePerGas: transactionGas.maxFeePerGas,
    maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas
  });

  const [delegatePDA] = authAccountAddress(solanaUser.neonWallet, neonEvmProgram, tokenFrom as SPLToken);
  const approve = createApproveInstruction(tokenATA, delegatePDA, solanaUser.publicKey, fullAmount);

  return [transaction, approve];
}

export function approveTokensForSwapTransaction(index: number, data: SwapTokenCommonData): ScheduledTransaction {
  const {
    pancakeRouter,
    amountFrom,
    tokenFrom,
    solanaUser,
    nonce,
    chainId,
    transactionGas
  } = data;

  return new ScheduledTransaction({
    index: index,
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: tokenFrom.address,
    callData: erc20ForSPLContract().encodeFunctionData('approve', [pancakeRouter, parseUnits(amountFrom.toString(), tokenFrom.decimals)]),
    chainId: chainId,
    gasLimit: transactionGas.gasLimit[index],
    maxFeePerGas: transactionGas.maxFeePerGas,
    maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas
  });
}

export function pancakeSwapTransaction(index: number, data: SwapTokenCommonData): ScheduledTransaction {
  const {
    transactionGas,
    amountFrom,
    tokenFrom,
    tokenTo,
    solanaUser,
    pancakeRouter,
    nonce,
    chainId
  } = data;
  const pancaceSwapInterface = new Interface(pancakeSwapRouterAbi);
  const fullAmountFrom = toFullAmount(amountFrom, tokenFrom.decimals);
  const deadline = Math.round((Date.now() + 10 * 60 * 1e3) / 1e3);
  const swapData = pancaceSwapInterface.encodeFunctionData('swapExactTokensForTokens', [fullAmountFrom, 0, [tokenFrom.address, tokenTo.address], solanaUser.neonWallet, deadline]);
  return new ScheduledTransaction({
    index: index,
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: pancakeRouter,
    callData: swapData,
    chainId: chainId,
    gasLimit: transactionGas.gasLimit[index],
    maxFeePerGas: transactionGas.maxFeePerGas,
    maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas
  });
}

export async function transferTokenToSolanaTransaction(index: number, params: SwapTokenCommonData): Promise<[ScheduledTransaction, TransactionInstruction | null]> {
  const {
    transactionGas,
    solanaUser,
    tokenFrom,
    tokenTo,
    amountFrom,
    nonce,
    chainId,
    provider,
    pancakePair,
    pancakeRouter,
    connection
  } = params;
  const contract = new Contract(tokenTo.address, erc20Abi, provider);
  const balance = await contract.balanceOf(solanaUser.neonWallet);
  let amount = await estimateSwapAmount(provider, [tokenFrom, tokenTo], amountFrom.toString(), pancakeRouter, pancakePair);
  if (balance > BigInt(0)) {
    amount = amount + balance;
  }
  const tokenMint = new PublicKey(tokenTo.address_spl);
  const ata = getAssociatedTokenAddressSync(tokenMint, solanaUser.publicKey);
  const transferSolanaData = erc20ForSPLContract().encodeFunctionData('transferSolana', [ata.toBuffer(), amount]);
  const instruction = await createATAInstruction(connection, solanaUser, tokenTo);

  const scheduledTransaction = new ScheduledTransaction({
    index: index,
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: tokenTo.address,
    callData: transferSolanaData,
    chainId: chainId,
    gasLimit: transactionGas.gasLimit[index],
    maxFeePerGas: transactionGas.maxFeePerGas,
    maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas
  });

  return [scheduledTransaction, instruction];
}

export async function transferWNeonToSolanaTransaction(index: number, params: SwapTokenCommonData): Promise<ScheduledTransaction[]> {
  const { transactionGas, solanaUser, tokenTo, nonce, chainId, provider } = params;
  const wNeonContract = new Contract(tokenTo.address, neonWrapper2Abi, provider);
  const wNeonBalance = await wNeonContract.balanceOf(solanaUser.neonWallet);
  const unwrapNeonData = neonWrapper2Contract().encodeFunctionData('withdraw', [wNeonBalance.toString()]);

  const unwrapNeonTransaction = new ScheduledTransaction({
    index: index,
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: tokenTo.address,
    callData: unwrapNeonData,
    chainId: chainId,
    gasLimit: transactionGas.gasLimit[0],
    maxFeePerGas: transactionGas.maxFeePerGas,
    maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas
  });

  return [unwrapNeonTransaction];
}

export async function approveSwapAndWithdrawTokensMultiple(params: SwapTokenCommonData): Promise<SwapTokensResponse> {
  const { neonEvmProgram, solanaUser, nonce, chainId, transactionGas } = params;
  const [claimTransaction, approveInstruction] = transferTokenToNeonTransaction(0, params);
  const approveSwapTransaction = approveTokensForSwapTransaction(1, params);
  const swapTransaction = pancakeSwapTransaction(2, params);
  const [transferSolanaTransaction, createATAInstruction] = await transferTokenToSolanaTransaction(3, params);

  const multiple = new MultipleTransactions(nonce, transactionGas.maxFeePerGas, transactionGas.maxPriorityFeePerGas);
  const transactions: ScheduledTransaction[] = [];

  // Approve clime to trx
  multiple.addTransaction(claimTransaction, 1, 0);
  transactions.push(claimTransaction);

  // Approve swap trx
  multiple.addTransaction(approveSwapTransaction, 2, 1);
  transactions.push(approveSwapTransaction);

  // Pancake Swap trx
  multiple.addTransaction(swapTransaction, 3, 1);
  transactions.push(swapTransaction);

  // Transfer to Solana trx
  multiple.addTransaction(transferSolanaTransaction, NO_CHILD_INDEX, 1);
  transactions.push(transferSolanaTransaction);

  // [1] scheduled trxs
  const scheduledTransaction = createScheduledNeonEvmMultipleTransaction({
    chainId: chainId,
    neonEvmProgram: neonEvmProgram,
    neonTransaction: multiple.data,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce
  });

  // [0] approve
  scheduledTransaction.instructions.unshift(approveInstruction);
  logJson(transactions.map(d => d.data));

  if (createATAInstruction) {
    scheduledTransaction.instructions.unshift(createATAInstruction);
  }

  return {
    scheduledTransaction,
    transactions
  };
}

export async function swapTokensMultipleV2(params: SwapTokenCommonData): Promise<SwapTokensResponse> {
  const {
    neonEvmProgram,
    solanaUser,
    nonce,
    chainId,
    transactionGas,
    connection,
    tokenFrom,
    amountFrom,
    tokenTo
  } = params;
  const approveSwapTransaction = approveTokensForSwapTransaction(0, params);
  const swapTransaction = pancakeSwapTransaction(1, params);

  const multiple = new MultipleTransactions(nonce, transactionGas.maxFeePerGas, transactionGas.maxPriorityFeePerGas);
  const transactions: ScheduledTransaction[] = [];

  // Approve swap trx
  multiple.addTransaction(approveSwapTransaction, 1, 0);
  transactions.push(approveSwapTransaction);

  // Pancake Swap trx
  multiple.addTransaction(swapTransaction, NO_CHILD_INDEX, 1);
  transactions.push(swapTransaction);

  // [1] scheduled trxs
  const scheduledTransaction = createScheduledNeonEvmMultipleTransaction({
    chainId: chainId,
    neonEvmProgram: neonEvmProgram,
    neonTransaction: multiple.data,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce
  });

  // [0?] approve
  const approveInstruction = await approveTokenV2Instruction(connection, solanaUser, neonEvmProgram, tokenFrom, amountFrom);
  if (approveInstruction) {
    scheduledTransaction.instructions.unshift(approveInstruction);
  }

  // [0] create ata
  const instruction = await createATAInstruction(connection, solanaUser, tokenTo);
  if (instruction) {
    scheduledTransaction.instructions.unshift(instruction);
  }

  logJson(transactions.map(d => d.data));

  return {
    scheduledTransaction,
    transactions
  };
}

export async function swapTokensMultipleWithGasFee(params: SwapTokenData, transactionData: EstimateScheduledTransaction[], transactionGas: TransactionGas, instructions: TransactionInstruction[] = []): Promise<SwapTokensResponse> {
  const {
    neonEvmProgram,
    solanaUser,
    nonce,
    chainId,
    connection,
    tokenTo
  } = params;

  const multiple = new MultipleTransactions(nonce, transactionGas.maxFeePerGas, transactionGas.maxPriorityFeePerGas);

  const transactions: ScheduledTransaction[] = [];
  for (let i = 0; i < transactionData.length; i++) {
    const data = transactionData[i];
    const scheduledTransaction = new ScheduledTransaction({
      index: i,
      nonce,
      chainId,
      payer: data.from,
      target: data.to,
      callData: data.data,
      maxFeePerGas: transactionGas.maxFeePerGas,
      maxPriorityFeePerGas: transactionGas.maxPriorityFeePerGas,
      gasLimit: transactionGas.gasLimit[i]
    });
    const childIndex = i === transactionData.length - 1 ? NO_CHILD_INDEX : i + 1;
    const successLimit = i === 0 ? 0 : 1;
    multiple.addTransaction(scheduledTransaction, childIndex, successLimit);
    transactions.push(scheduledTransaction);
  }

  // [1] scheduled trxs
  const scheduledTransaction = createScheduledNeonEvmMultipleTransaction({
    chainId: chainId,
    neonEvmProgram: neonEvmProgram,
    neonTransaction: multiple.data,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce
  });

  if (instructions.length > 0) {
    for (const instruction of instructions) {
      scheduledTransaction.instructions.unshift(instruction);
    }
  }

  // [0?] create ata
  const instruction = await createATAInstruction(connection, solanaUser, tokenTo);
  if (instruction) {
    scheduledTransaction.instructions.unshift(instruction);
  }

  logJson(transactions.map(d => d.data));

  return {
    scheduledTransaction,
    transactions
  };
}

export async function approveTokenV1Instruction(connection: Connection, solanaUser: SolanaNeonAccount, neonEvmProgram: PublicKey, token: CSPLToken, amount: number): Promise<TransactionInstruction | null> {
  const fullAmount = toFullAmount(amount, token.decimals);
  const tokenATA = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), solanaUser.publicKey);
  const [delegatePDA] = authAccountAddress(solanaUser.neonWallet, neonEvmProgram, token as SPLToken);
  const tokenATAAccount = await getAccount(connection, tokenATA);
  if (!(tokenATAAccount.delegate?.equals(delegatePDA) && tokenATAAccount.delegatedAmount > fullAmount)) {
    return createApproveInstruction(tokenATA, delegatePDA, solanaUser.publicKey, fullAmount);
  }
  return null;
}

export async function approveTokenV2Instruction(connection: Connection, solanaUser: SolanaNeonAccount, neonEvmProgram: PublicKey, token: CSPLToken, amount: number): Promise<TransactionInstruction | null> {
  const fullAmount = toFullAmount(amount, token.decimals);
  const tokenATA = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), solanaUser.publicKey);
  const [delegatePDA] = neonWalletProgramAddress(token.address, neonEvmProgram);
  const tokenATAAccount = await getAccount(connection, tokenATA);
  if (!(tokenATAAccount.delegate?.equals(delegatePDA) && tokenATAAccount.delegatedAmount > fullAmount)) {
    return createApproveInstruction(tokenATA, delegatePDA, solanaUser.publicKey, fullAmount);
  }
  return null;
}

export async function createATAInstruction(connection: Connection, solanaUser: SolanaNeonAccount, token: CSPLToken): Promise<TransactionInstruction | null> {
  const tokenMint = new PublicKey(token.address_spl);
  const ata = getAssociatedTokenAddressSync(tokenMint, solanaUser.publicKey);

  const account = await connection.getAccountInfo(ata);
  let instruction = null;
  if (!account) {
    instruction = createAssociatedTokenAccountInstruction(solanaUser.publicKey, ata, solanaUser.publicKey, tokenMint);
  }
  return instruction;
}

export async function estimateSwapAmount(provider: JsonRpcProvider, tokenFromTo: [CSPLToken, CSPLToken], amountFrom: string, pancakeRouter: NeonAddress, pancakePair: PancakePair): Promise<bigint> {
  try {
    const [tokenFrom] = tokenFromTo;
    const amountIn = new Big(amountFrom).times(new Big(10).pow(tokenFrom.decimals));
    const router = new Contract(pancakeRouter, pancakeSwapRouterAbi, provider);
    const pairContract = new Contract(pancakePair.pair, pancakeSwapPairAbi, provider);
    const [one, two] = await pairContract.getReserves();
    const [from, to] = tokenFrom.address === pancakePair.a ? [one, two] : [two, one];
    return router.getAmountOut(amountIn.toString(), from, to);
  } catch (e) {
    console.log(e);
  }
  return BigInt(0);
}
