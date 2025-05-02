import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, PublicKey, TokenAmount, TransactionInstruction } from '@solana/web3.js';
import {
  delay,
  log,
  logJson,
  NeonAddress,
  PreparatorySolanaTransaction,
  prepareSolanaInstruction,
  ScheduledTransactionStatus,
  SolanaNeonAccount,
  TransactionData
} from '@neonevm/solana-sign';
import { SPLToken } from '@neonevm/token-transfer-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Big } from 'big.js';
import { TokenField } from './components/TokenField/TokenField';
import SwapState from './components/SwapState/SwapState';
import { useProxyConnection } from '../wallet/Connection';
import {
  CSPLToken,
  CTokenBalance,
  FormState,
  PancakePair,
  SwapTokenData,
  SwapTokensResponse
} from '../models';
import { createATAInstruction, estimateSwapAmount } from '../api/swap';
import { PROXY_ENV } from '../environments';
import './SwapForm.css';

interface FormData {
  from: { token: string, amount: string },
  to: { token: string, amount: string },
}

const DURATION = 3e5;
const DELAY = 1e3;
const MAX_AMOUNT = PROXY_ENV === 'devnet' ? 10 : 20;

interface Props {
  tokensList: CSPLToken[];

  dataMethod(params: SwapTokenData): Promise<TransactionData[]>;

  approveMethod(connection: Connection, solanaUser: SolanaNeonAccount, neonEvmProgram: PublicKey, token: CSPLToken, amount: number): Promise<TransactionInstruction | null>;
}

export const SwapForm = (props: Props) => {
  const { tokensList, dataMethod, approveMethod } = props;
  const { connected, publicKey } = useWallet();
  const [tokenBalanceList, setTokenBalanceList] = useState<CTokenBalance[]>([]);
  const { connection } = useConnection();
  const {
    solanaUser,
    proxyApi,
    chainId,
    neonEvmProgram,
    sendTransaction,
    provider,
    addresses
  } = useProxyConnection();
  const [loading, setLoading] = useState<boolean>(false);
  const [transactionStates, setTransactionStates] = useState<FormState[]>([]);
  const transactionsRef = useRef<FormState[]>([]);
  const [error, setError] = useState<string>(``);
  const [fieldLoading, setFieldLoading] = useState<boolean>(false);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    from: { token: '', amount: '' },
    to: { token: '', amount: '' }
  });

  const formValidation = useMemo((): boolean => {
    const { from, to } = formData;
    const tokenFrom = tokenBalanceList.find(t => t.token.symbol === formData.from.token)!;
    const a = Number(from.amount);
    const b = Number(to.amount);
    const c = [NaN, 0];
    return !from.amount || !to.amount || c.includes(a) || c.includes(b) || !tokenFrom?.balance?.amount ||
      Number(from.amount) > Number(tokenFrom?.balance?.uiAmount);
  }, [formData, tokenBalanceList]);

  const tokenFromTo = useMemo<CSPLToken[]>(() => {
    if (tokensList.length > 0) {
      const tokenFrom = tokensList.find(t => t.symbol === formData.from.token)!;
      const tokenTo = tokensList.find(t => t.symbol === formData.to.token)!;
      return [tokenFrom, tokenTo];
    }
    return [];
  }, [formData.from.token, formData.to.token, tokensList]);

  const pancakePair = useMemo<PancakePair>(() => {
    if (tokenFromTo.length > 0) {
      const [tokenFrom, tokenTo] = tokenFromTo;
      const pair = `${tokenFrom?.symbol}/${tokenTo?.symbol}`.toLowerCase();
      return addresses.swap.pairs[pair];
    }
    return {} as PancakePair;
  }, [addresses.swap.pairs, tokenFromTo]);

  const buttonText = useMemo((): string => {
    const { from, to } = formData;
    if (!connected) {
      return `Connect wallet`;
    }
    if (!pancakePair?.pair) {
      return `Unsupported pair`;
    }
    if (from.amount?.length === 0 || to.amount?.length === 0) {
      return `Enter an amount`;
    }
    if (loading) {
      return `Wait...`;
    }
    return `Swap`;
  }, [formData, connected, loading, pancakePair]);

  const formDisabled = useMemo<boolean>(() => {
    return !publicKey || !pancakePair || formValidation || loading || fieldLoading;
  }, [formValidation, loading, pancakePair, publicKey, fieldLoading]);

  const changeTransactionStates = (state: FormState): void => {
    setTransactionStates(prev => prev.map(st => {
      if (st.id === state.id) {
        return state;
      }
      return st;
    }));
  };

  const addTransactionStates = (states: FormState[]): void => {
    setTransactionStates(_ => states);
  };

  const resetTransactionStates = (): void => {
    setTransactionStates(_ => []);
  };

  const swapTokens = async (nonce: number): Promise<SwapTokensResponse> => {
    const [tokenFrom, tokenTo] = tokenFromTo;
    const amountFrom = Number(formData.from.amount);
    const amountTo = Number(formData.to.amount);
    const pancakeRouter: NeonAddress = addresses.swap.router;
    const params: SwapTokenData = {
      nonce,
      proxyApi,
      provider,
      connection,
      solanaUser,
      neonEvmProgram,
      tokenFrom,
      tokenTo,
      amountFrom,
      amountTo,
      pancakePair,
      pancakeRouter,
      chainId
    };
    const transactionsData = await dataMethod(params);
    const approveInstruction = await approveMethod(connection, solanaUser, neonEvmProgram, tokenFrom, amountFrom);
    const preparatorySolanaTransactions: PreparatorySolanaTransaction[] = [];
    const solanaInstructions: TransactionInstruction[] = [];
    if (approveInstruction) {
      preparatorySolanaTransactions.push({
        instructions: [prepareSolanaInstruction(approveInstruction!)]
      });
      solanaInstructions.push(approveInstruction);
    }
    const transactionGas = await proxyApi.estimateScheduledTransactionGas({
      solanaPayer: solanaUser.publicKey,
      transactions: transactionsData,
      preparatorySolanaTransactions
    });

    const { transactions, scheduledTransaction } = await proxyApi.createMultipleTransaction({
      transactionGas,
      transactionsData,
      solanaInstructions
    });

    const instruction = await createATAInstruction(connection, solanaUser, tokenTo);
    if (instruction) {
      scheduledTransaction.instructions.unshift(instruction);
    }

    return { transactions, scheduledTransaction };
  };

  const cancelTransaction = async (_: ScheduledTransactionStatus) => {
    const { result } = await proxyApi.getPendingTransactions(solanaUser.publicKey);
    log(result);
  };

  const executeTransactionState = async (state: FormState): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const nonce = Number(await proxyApi.getTransactionCount(solanaUser.neonWallet));
      const { scheduledTransaction, transactions } = await state.method(nonce);
      changeTransactionStates(state);
      if (scheduledTransaction.instructions.length > 0) {
        const signature = await sendTransaction(scheduledTransaction, 'confirmed', { skipPreflight: false });
        if (signature) {
          state.status = transactions.length === 0 ? 'Success' : 'NotStarted';
          state.signature = signature;
          changeTransactionStates(state);
        }
      } else {
        state.status = 'Success';
      }

      if (transactions.length > 0) {
        await delay(1e3);
        const resultsHash = await proxyApi.sendRawScheduledTransactions(transactions.map(t => t.serialize()));
        logJson(resultsHash);

        const start = Date.now();
        while (DURATION > Date.now() - start) {
          const { result } = await proxyApi.getScheduledTreeAccount(solanaUser.neonWallet, nonce);
          if (result) {
            state.data = result;
            state.status = result.activeStatus;
            state.isCompleted = result.transactions.every(i => i.status === 'Success');
            changeTransactionStates(state);
            if (['Success', 'Empty', 'Failed', 'Skipped'].includes(result.activeStatus)) {
              break;
            }
          } else {
            break;
          }
          await delay(DELAY);
        }
      }
    } catch (e) {
      state.status = 'Failed';
      log(e.message);
      setError(e.message);
      setLoading(false);
    }
  };

  const executeTransactionsStates = async (transactionStates: FormState[]): Promise<void> => {
    for (let i = 0; i < transactionStates.length; i++) {
      const state = transactionStates[i];
      if (i > 0 && ['Failed', 'Skipped', 'NoStarted'].includes(transactionStates[i - 1].status)) {
        break;
      } else {
        log(`Run transaction ${state.title}`);
        await executeTransactionState(state);
        await delay(1e3);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const swapTokensState: FormState = {
        id: 0,
        title: `Swap tokens`,
        status: `NotStarted`,
        signature: ``,
        isCompleted: false,
        method: swapTokens,
        data: undefined
      };
      transactionsRef.current = [swapTokensState];
      addTransactionStates(transactionsRef.current);
      await executeTransactionsStates(transactionsRef.current);
      setLoading(false);
    } catch (e: unknown) {
      log(e.message);
      if (transactionsRef.current.some(i => !i.data)) {
        transactionsRef.current = [];
        addTransactionStates(transactionsRef.current);
      }
      setLoading(false);
    }
  };

  const handleSwitch = () => {
    const { from, to } = formData;
    // note: potential bug
    if (Number(to.amount) > MAX_AMOUNT) {
      to.amount = MAX_AMOUNT.toString();
    }
    setFormData({ from: to, to: from });
    setError('');
    resetTransactionStates();
  };

  const handleTokenData = (type: 'from' | 'to', value: {
    token: string;
    amount: string;
  }): void => {
    setFormData(prevData => {
      if (prevData[type].token !== value.token || prevData[type].amount !== value.amount) {
        setError('');
        resetTransactionStates();
      }
      return ({ ...prevData, [type]: value });
    });
  };

  const getTokenBalance = async (token: CSPLToken): Promise<TokenAmount | undefined> => {
    if (publicKey) {
      try {
        const tokenMint = new PublicKey(token.address_spl);
        const tokenAddress = getAssociatedTokenAddressSync(tokenMint, publicKey);
        const { value: balance } = await connection.getTokenAccountBalance(tokenAddress);
        return balance;
      } catch (e) {
        log(e?.message);
      }
    }
    return undefined;
  };

  const getBalance = async (): Promise<void> => {
    const tokens: CTokenBalance[] = [];
    for (const token of tokensList) {
      const cTokenBalance: CTokenBalance = { token, balance: undefined };
      cTokenBalance.balance = await getTokenBalance(token);
      tokens.push(cTokenBalance);
    }
    setTokenBalanceList(() => tokens);
  };

  const updateTokenBalance = async (token: SPLToken): Promise<void> => {
    const id = tokenBalanceList.findIndex(i => i.token.address === token.address);
    setBalanceLoading(true);
    if (id > -1) {
      const cTokenBalance = tokenBalanceList[id];
      cTokenBalance.balance = await getTokenBalance(token);
    }
    setTokenBalanceList(() => tokenBalanceList);
    setBalanceLoading(false);
  };

  useEffect(() => {
    if (tokensList.length > 0) {
      setFormData(prevState => {
        const [one, two] = tokensList;
        prevState.from.token = one.symbol;
        prevState.to.token = two.symbol;
        return prevState;
      });
    }
  }, [addresses, tokensList]);

  useEffect(() => {
    getBalance().catch(log);
  }, [publicKey, loading]);

  useEffect(() => {
    if (!connected) {
      resetTransactionStates();
      setFormData(prevState => {
        prevState.from.amount = '';
        prevState.to.amount = '';
        return prevState;
      });
    }
  }, [connected]);

  useEffect(() => {
    const amountFrom = formData.from.amount;
    if (pancakePair && amountFrom && Number(amountFrom) > 0) {
      setFieldLoading(true);
      estimateSwapAmount(provider, tokenFromTo, amountFrom, addresses.swap.router, pancakePair).then(balance => {
        const [, tokenTo] = tokenFromTo;
        const amount = new Big(balance.toString()).div(new Big(10).pow(tokenTo.decimals)).toString();
        handleTokenData('to', { token: formData.to.token, amount });
      }).then(() => delay(300)).then(() => {
        setFieldLoading(false);
      });
    } else {
      handleTokenData('to', { token: formData.to.token, amount: '' });
    }
  }, [formData.from.amount, tokenFromTo, provider, pancakePair]);

  return (
    <>
      <div className="form-group">
        <div className="form-field">
          <TokenField data={formData.from} tokensList={tokenBalanceList}
                      excludedToken={formData.to.token}
                      setTokenData={handleTokenData}
                      updateTokenBalance={updateTokenBalance}
                      maxAmount={MAX_AMOUNT}
                      loading={balanceLoading}
                      label="From" type="from"></TokenField>
        </div>
        <div className="form-divider">
          <button className="switch-tokens" type={'button'} onClick={handleSwitch}
                  disabled={fieldLoading}>
            <img src="/assets/icons/switch.svg" alt="Switch" />
          </button>
        </div>
        <div className="form-field">
          <TokenField data={formData.to} tokensList={tokenBalanceList}
                      excludedToken={formData.from.token}
                      setTokenData={handleTokenData}
                      updateTokenBalance={updateTokenBalance}
                      maxAmount={MAX_AMOUNT}
                      loading={fieldLoading || balanceLoading}
                      disabled={true}
                      label="To" type="to"></TokenField>
        </div>
      </div>
      {transactionStates.length > 0 && <div className="form-group">
        <div className="form-field">
          {transactionStates.map((state, key) => {
            return <SwapState key={key} formState={state} loading={loading}
                              executeState={executeTransactionState}
                              setLoading={setLoading}
                              transactionCancel={cancelTransaction}></SwapState>;
          })}
        </div>
      </div>}
      {error.length > 0 && <div className="form-error">{error}</div>}
      <div className="form-group">
        <div className="form-field">
          <button className="form-button" onClick={handleSubmit} disabled={formDisabled}>
            {buttonText}
          </button>
        </div>
      </div>
    </>
  );
};

export default SwapForm;
