import { createContext, FC, useContext, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Commitment, PublicKey, SendOptions, Transaction } from '@solana/web3.js';
import { solanaTransactionLog } from '@neonevm/token-transfer-core';
import {
  delay,
  getGasToken,
  getProxyState,
  logJson,
  NeonProxyRpcApi,
  SolanaNeonAccount
} from '@neonevm/solana-sign';
import { JsonRpcProvider } from 'ethers';
import { NEON_CORE_API_RPC_URL, PROXY_ENV, SOLANA_URL } from '../environments';
import { simulateTransaction } from '../utils/solana.ts';
import { Props } from '../models';
import { Big } from 'big.js';

export interface ProxyConnectionContextData {
  chainId: number;
  tokenMint: PublicKey;
  neonEvmProgram: PublicKey;
  solanaUser: SolanaNeonAccount;
  proxyApi: NeonProxyRpcApi;
  provider: JsonRpcProvider;
  walletBalance: number;

  sendTransaction(transaction: Transaction, commitment?: Commitment, options?: SendOptions): Promise<string | undefined>;

  getWalletBalance(): Promise<void>;
}

export const ProxyConnectionContext = createContext<ProxyConnectionContextData>({} as ProxyConnectionContextData);
export const ProxyConnectionProvider: FC<Props> = ({ children }) => {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [neonEvmProgram, setEvmProgramAddress] = useState<PublicKey>();
  const [proxyApi, setProxyApi] = useState<NeonProxyRpcApi>();
  const [tokenMint, setTokenMint] = useState<PublicKey>();
  const [chainId, setChainId] = useState<number>();
  const [walletBalance, setWalletBalance] = useState(0);
  let watchAccountId: number;

  const sendTransaction = async (transaction: Transaction, commitment: Commitment = 'confirmed', options?: SendOptions): Promise<string | undefined> => {
    if (signTransaction) {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = solanaUser.publicKey;
      const { value } = await simulateTransaction(connection, transaction, commitment);
      logJson(value.err);
      logJson(value.logs);
      const signedTransaction = await signTransaction(transaction);
      solanaTransactionLog(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), options);
      if (PROXY_ENV === 'devnet') {
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature
        }, commitment);
      } else {
        await delay(5e3);
      }
      console.log(`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${SOLANA_URL}`);
      return signature;
    }
  };

  const solanaUser = useMemo<SolanaNeonAccount>(() => {
    if (connected && publicKey && neonEvmProgram && tokenMint && chainId) {
      return new SolanaNeonAccount(publicKey, neonEvmProgram, tokenMint, chainId);
    }
  }, [connected, publicKey, neonEvmProgram, tokenMint, chainId]);

  const provider = useMemo<JsonRpcProvider>(() => {
    return new JsonRpcProvider(`${NEON_CORE_API_RPC_URL}/sol`);
  }, []);

  const getWalletBalance = async () => {
    try {
      if (publicKey && connection) {
        const b = await connection.getBalance(publicKey);
        if (b) {
          setWalletBalance(b);
        }
        if (provider && solanaUser) {
          const b = await provider.getBalance(solanaUser.neonWallet);
          console.log(`${solanaUser.neonWallet}: ${new Big(b.toString()).div(1e18).toString()} SOL`);
        }
      } else {
        setWalletBalance(0);
      }
    } catch (e) {
      console.log(e);
      setWalletBalance(0);
    }
  };

  useEffect(() => {
    (async () => {
      const { chainId: chainIdB } = await provider.getNetwork();
      const result = await getProxyState(`${NEON_CORE_API_RPC_URL}/sol`);
      setEvmProgramAddress(result.evmProgramAddress);
      setProxyApi(result.proxyApi);
      setChainId(Number(chainIdB));
      const token = getGasToken(result.tokensList, Number(chainIdB));
      setTokenMint(token.tokenMintAddress);
    })();
  }, [provider]);

  useEffect(() => {
    getWalletBalance().then();
    if (publicKey) {
      watchAccountId = connection.onAccountChange(publicKey, (updatedAccountInfo) => {
        setWalletBalance(updatedAccountInfo.lamports);
      }, { commitment: 'confirmed', encoding: 'jsonParsed' });
    } else if (watchAccountId) {
      connection.removeAccountChangeListener(watchAccountId).then();
    }
  }, [publicKey, connection, getWalletBalance]);

  return (
    <ProxyConnectionContext.Provider value={{
      chainId: chainId!,
      tokenMint: tokenMint!,
      neonEvmProgram: neonEvmProgram!,
      solanaUser: solanaUser!,
      proxyApi: proxyApi!,
      provider: provider!,
      walletBalance,
      sendTransaction,
      getWalletBalance
    }}>
      {children}
    </ProxyConnectionContext.Provider>
  );
};

export const useProxyConnection = () => useContext(ProxyConnectionContext);
