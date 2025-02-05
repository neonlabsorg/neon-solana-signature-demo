import {
  claimTransactionData,
  erc20ForSPLContract,
  mintNeonTransactionData
} from '@neonevm/token-transfer-ethers';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  createScheduledNeonEvmMultipleTransaction,
  createScheduledNeonEvmTransaction,
  EstimateScheduledTransaction,
  logJson,
  MultipleTransactions, NeonProxyRpcApi,
  NO_CHILD_INDEX,
  ScheduledTransaction,
  SolanaNeonAccount
} from '@neonevm/solana-sign';
import { erc20Abi, SPLToken, toFullAmount } from '@neonevm/token-transfer-core';
import { Contract, Interface, JsonRpcProvider, parseUnits } from 'ethers';
import { pancakeSwapAbi } from '../data/pancakeSwap';
import {
  CSPLToken,
  SwapTokenMultipleData,
  SwapTokensData,
  SwapTokensResponse,
  TransferTokenData
} from '../models';

export async function swapTokens(data: SwapTokenMultipleData): Promise<SwapTokensResponse> {
  const {
    proxyApi,
    solanaUser,
    nonce,
    amountFrom,
    amountTo,
    tokenFrom,
    tokenTo,
    chainId,
    neonEvmProgram,
    pancakeRouter
  } = data;

  // one
  const tokenFromATA = getAssociatedTokenAddressSync(new PublicKey(tokenFrom.address_spl), solanaUser.publicKey);
  const climeToData = claimTransactionData(tokenFromATA, solanaUser.neonWallet, amountFrom);

  // two
  const pancaceSwapInterface = new Interface(pancakeSwapAbi);
  const fullAmountFrom = toFullAmount(amountFrom, tokenFrom.decimals);
  // const fullAmountTo = toFullAmount(amountTo, tokenTo.decimals);
  const time = (Date.now() + 10 * 60 * 1e3);
  const swapData = pancaceSwapInterface.encodeFunctionData('swapExactTokensForTokens', [fullAmountFrom, 0n, [tokenFrom.address, tokenTo.address], solanaUser.neonWallet, time]);
  console.log(swapData);

  // three
  const tokenToATA = getAssociatedTokenAddressSync(new PublicKey(tokenTo.address_spl), solanaUser.publicKey);
  const transferSolanaData = mintNeonTransactionData(tokenToATA, tokenTo as SPLToken, amountTo);

  const { result, error } = await proxyApi.estimateScheduledGas({
    scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
    transactions: [{
      from: solanaUser.neonWallet,
      to: tokenFrom.address,
      data: climeToData
    }, {
      from: solanaUser.neonWallet,
      to: pancakeRouter,
      data: swapData
    }, {
      from: solanaUser.neonWallet,
      to: tokenTo.address,
      data: transferSolanaData
    }]
  });

  if (error) {
    console.log(error);
    logJson(error.message);
  }
  logJson(result);

  const maxFeePerGas = result?.maxFeePerGas;
  const maxPriorityFeePerGas = result?.maxPriorityFeePerGas;
  const gasLimit = result?.gasList;
  const transactionSendTokenA = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    index: 0,
    target: tokenFrom.address,
    callData: climeToData,
    gasLimit: gasLimit[0],
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    chainId: chainId
  });

  const transactionSwapTokensAtoB = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    index: 1,
    target: pancakeRouter,
    callData: swapData,
    gasLimit: gasLimit[1],
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    chainId: chainId
  });

  const transactionSendTokenB = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    index: 2,
    target: tokenTo.address,
    callData: transferSolanaData,
    gasLimit: gasLimit[2],
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    chainId: chainId
  });

  const multiple = new MultipleTransactions(nonce, maxFeePerGas);
  multiple.addTransaction(transactionSendTokenA, 1, 0);
  multiple.addTransaction(transactionSwapTokensAtoB, 2, 1);
  multiple.addTransaction(transactionSendTokenB, NO_CHILD_INDEX, 1);

  // [1] scheduled trx
  const scheduledTransaction = await createScheduledNeonEvmMultipleTransaction({
    chainId: chainId,
    neonEvmProgram: neonEvmProgram,
    neonTransaction: multiple.data,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce
  });

  return {
    scheduledTransaction,
    transactions: [
      transactionSendTokenA,
      transactionSwapTokensAtoB,
      transactionSendTokenB
    ]
  };
}

export async function transferTokenToNeonEvm(data: TransferTokenData): Promise<Transaction> {
  const {
    proxyApi,
    solanaUser,
    neonEvmProgram,
    token,
    chainId,
    amount,
    nonce
  } = data;

  const fullAmount = toFullAmount(amount, token.decimals);
  const tokenATA = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), solanaUser.publicKey);
  const climeData = claimTransactionData(tokenATA, solanaUser.neonWallet, fullAmount);

  const { result, error } = await proxyApi.estimateScheduledGas({
    scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
    transactions: [{
      from: solanaUser.neonWallet,
      to: token.address,
      data: climeData
    }]
  });

  if (error) {
    logJson(error);
  }

  logJson(result);

  const maxFeePerGas = result?.maxFeePerGas;
  const maxPriorityFeePerGas = result?.maxPriorityFeePerGas;
  const gasLimit = result?.gasList[0];
  const transaction1 = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: token.address,
    callData: climeData,
    chainId: chainId
  });
  console.log(JSON.stringify(transaction1.data, null, 2));

  const transaction = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: token.address,
    callData: climeData,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    gasLimit: gasLimit,
    chainId: chainId
  });

  return createScheduledNeonEvmTransaction({
    chainId: chainId,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonEvmProgram: neonEvmProgram,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce,
    neonTransaction: transaction.serialize()
  });
}

export async function approveToken(data: SwapTokensData): Promise<Transaction> {
  const {
    proxyApi,
    solanaUser,
    neonEvmProgram,
    tokenFrom,
    chainId,
    amount,
    nonce,
    // pancakeRouter,
    pancakePair
  } = data;

  const approveData = erc20ForSPLContract().encodeFunctionData('approve', [pancakePair, parseUnits(amount.toString(), tokenFrom.decimals)]);

  const { result, error } = await proxyApi.estimateScheduledGas({
    scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
    transactions: [{
      from: solanaUser.neonWallet,
      to: tokenFrom.address,
      data: approveData
    }]
  });

  if (error) {
    logJson(error);
  }

  logJson(result);

  const maxFeePerGas = result?.maxFeePerGas;
  const maxPriorityFeePerGas = result?.maxPriorityFeePerGas;
  const gasLimit = result?.gasList[0];
  const transaction = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: tokenFrom.address,
    callData: approveData,
    gasLimit: gasLimit,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    chainId: chainId
  });

  return createScheduledNeonEvmTransaction({
    chainId: chainId,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonEvmProgram: neonEvmProgram,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce,
    neonTransaction: transaction.serialize()
  });
}

export async function approveTokens(data: SwapTokensData): Promise<SwapTokensResponse> {
  const {
    proxyApi,
    solanaUser,
    neonEvmProgram,
    tokenFrom,
    tokenTo,
    chainId,
    amount,
    nonce,
    pancakeRouter,
    pancakePair
  } = data;

  // const approvePairData = erc20ForSPLContract().encodeFunctionData('approve', [pancakePair, parseUnits(amount.toString(), tokenFrom.decimals)]);
  const approveTokenFromData = erc20ForSPLContract().encodeFunctionData('approve', [pancakeRouter, parseUnits(amount.toString(), tokenFrom.decimals)]);
  const approveTokenToData = erc20ForSPLContract().encodeFunctionData('approve', [pancakeRouter, parseUnits(amount.toString(), tokenTo.decimals)]);
  const approvePairFromData = erc20ForSPLContract().encodeFunctionData('approve', [pancakePair, parseUnits(amount.toString(), tokenFrom.decimals)]);
  const approvePairToData = erc20ForSPLContract().encodeFunctionData('approve', [pancakePair, parseUnits(amount.toString(), tokenTo.decimals)]);

  const transactions: EstimateScheduledTransaction[] = [{
    from: solanaUser.neonWallet,
    to: tokenFrom.address,
    data: approveTokenFromData
  }, {
    from: solanaUser.neonWallet,
    to: tokenTo.address,
    data: approveTokenToData
  }, {
    from: solanaUser.neonWallet,
    to: tokenFrom.address,
    data: approvePairFromData
  }, {
    from: solanaUser.neonWallet,
    to: tokenTo.address,
    data: approvePairToData
  }];

  const { result, error } = await proxyApi.estimateScheduledGas({
    scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
    transactions
  });

  if (error) {
    logJson(error);
  }

  logJson(result);

  const maxFeePerGas = result?.maxFeePerGas;
  const maxPriorityFeePerGas = result?.maxPriorityFeePerGas;
  const gasLimit = result?.gasList;
  const multiple = new MultipleTransactions(nonce, maxFeePerGas, maxPriorityFeePerGas);

  const scheduledTransactions: ScheduledTransaction[] = [];
  for (let i = 0; i < transactions.length; i++) {
    const trx = transactions[i];
    const scheduledTransaction = new ScheduledTransaction({
      index: i,
      nonce: nonce,
      payer: trx.from,
      target: trx.to,
      callData: trx.data,
      gasLimit: gasLimit[i],
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
      chainId: chainId
    });
    multiple.addTransaction(scheduledTransaction, NO_CHILD_INDEX, 0);
    scheduledTransactions.push(scheduledTransaction);
  }

  // [1] scheduled trx
  const scheduledTransaction = await createScheduledNeonEvmMultipleTransaction({
    chainId: chainId,
    neonEvmProgram: neonEvmProgram,
    neonTransaction: multiple.data,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce
  });

  return {
    scheduledTransaction,
    transactions: scheduledTransactions
  };
}

export async function pancakeTokensSwap(data: SwapTokensData): Promise<Transaction> {
  const {
    proxyApi,
    solanaUser,
    neonEvmProgram,
    tokenFrom,
    tokenTo,
    chainId,
    amount,
    nonce,
    pancakeRouter
  } = data;

  const pancaceSwapInterface = new Interface(pancakeSwapAbi);
  const fullAmountFrom = toFullAmount(amount, tokenFrom.decimals);
  const deadline = Math.round((Date.now() + 60 * 60 * 1e3) / 1e3);
  const swapData = pancaceSwapInterface.encodeFunctionData('swapExactTokensForTokens', [fullAmountFrom, 0, [tokenFrom.address, tokenTo.address], solanaUser.neonWallet, deadline]);

  const { result, error } = await proxyApi.estimateScheduledGas({
    scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
    transactions: [{
      from: solanaUser.neonWallet,
      to: pancakeRouter,
      data: swapData
    }]
  });

  if (error) {
    logJson(error);
    const reason = pancaceSwapInterface.parseError(error.data);
    logJson(reason);
    // throw new Error(error.message);
  }

  logJson(result);

  const maxFeePerGas = result?.maxFeePerGas ?? 3000000000;
  const maxPriorityFeePerGas = result?.maxPriorityFeePerGas ?? 2500000000;
  const gasLimit = result?.gasList[0] ?? 1e5;

  console.log(maxFeePerGas, maxPriorityFeePerGas, gasLimit);
  const transaction = new ScheduledTransaction({
    nonce: nonce,
    payer: solanaUser.neonWallet,
    target: pancakeRouter,
    callData: swapData,
    gasLimit: gasLimit,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    chainId: chainId
  });

  return createScheduledNeonEvmTransaction({
    chainId: chainId,
    signerAddress: solanaUser.publicKey,
    tokenMintAddress: solanaUser.tokenMint,
    neonEvmProgram: neonEvmProgram,
    neonWallet: solanaUser.neonWallet,
    neonWalletNonce: nonce,
    neonTransaction: transaction.serialize()
  });
}

export async function handleTokensBack(provider: JsonRpcProvider, neonEvmProgram: PublicKey, proxyApi: NeonProxyRpcApi, solanaUser: SolanaNeonAccount, token: CSPLToken): Promise<void> {
  console.log(token);
  if (token) {
    const contract = new Contract(token.address, erc20Abi, provider);
    const balance = await contract.balanceOf(solanaUser.neonWallet);
    if (balance) {
      const ata = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), solanaUser.publicKey);
      const data = mintNeonTransactionData(ata, token as SPLToken, balance);
      const { result, error } = await proxyApi.estimateScheduledGas({
        scheduledSolanaPayer: solanaUser.publicKey.toBase58(),
        transactions: [{
          from: solanaUser.neonWallet,
          to: token.address,
          data
        }]
      });

      logJson(result);
      logJson(error);

      const nonce = 1;
      const chainId = 1;
      const maxFeePerGas = result?.maxFeePerGas;
      const maxPriorityFeePerGas = result?.maxPriorityFeePerGas;
      const gasLimit = result?.gasList[0];
      const scheduledTransaction = new ScheduledTransaction({
        nonce: nonce,
        payer: solanaUser.neonWallet,
        index: 0,
        target: token.address,
        callData: data,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        gasLimit: gasLimit,
        chainId: chainId
      });

      console.log(scheduledTransaction.data);

      return createScheduledNeonEvmTransaction({
        chainId: chainId,
        signerAddress: solanaUser.publicKey,
        tokenMintAddress: solanaUser.tokenMint,
        neonEvmProgram: neonEvmProgram,
        neonWallet: solanaUser.neonWallet,
        neonWalletNonce: nonce,
        neonTransaction: scheduledTransaction.serialize()
      });
    }
  }
}
