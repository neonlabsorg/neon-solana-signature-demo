import { createContext, FC, useContext, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Commitment, PublicKey, SendOptions, Transaction } from '@solana/web3.js';
import { solanaTransactionLog } from '@neonevm/token-transfer-core';
import { delay, log, logJson, NeonProxyRpcApi, SolanaNeonAccount } from '@neonevm/solana-sign';
import { JsonRpcProvider } from 'ethers';
import { Big } from 'big.js';
import { NEON_CORE_API_RPC_URL, PROXY_ENV, SOLANA_URL } from '../environments';
import { simulateTransaction } from '../utils/solana';
import { Props, TokensListResponse } from '../models';
import { getTokensList } from '../api/tokens';
import { tokens } from '../data/tokens';

export interface ProxyConnectionContextData {
  chainId: number;
  tokenMint: PublicKey;
  neonEvmProgram: PublicKey;
  solanaUser: SolanaNeonAccount;
  proxyApi: NeonProxyRpcApi;
  provider: JsonRpcProvider;
  walletBalance: number;
  addresses: TokensListResponse;

  sendTransaction(transaction: Transaction, commitment?: Commitment, options?: SendOptions): Promise<string | undefined>;

  getWalletBalance(): Promise<void>;
}

export const ProxyConnectionContext = createContext<ProxyConnectionContextData>({} as ProxyConnectionContextData);
export const ProxyConnectionProvider: FC<Props> = ({ children }) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [neonEvmProgram, setEvmProgramAddress] = useState<PublicKey>();
  const [proxyApi, setProxyApi] = useState<NeonProxyRpcApi>();
  const [tokenMint, setTokenMint] = useState<PublicKey>();
  const [chainId, setChainId] = useState<number>();
  const [solanaUser, setSolanaUser] = useState<SolanaNeonAccount>();
  const [provider, setProvider] = useState<JsonRpcProvider>();
  const [walletBalance, setWalletBalance] = useState(0);
  const data = tokens(PROXY_ENV);
  const [addresses, setAddresses] = useState<TokensListResponse>(data);
  let watchAccountId: number;

  const sendTransaction = async (transaction: Transaction, commitment: Commitment = 'confirmed', options?: SendOptions): Promise<string | undefined> => {
    if (signTransaction && solanaUser) {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = transaction.recentBlockhash ? transaction.recentBlockhash : blockhash;
      transaction.lastValidBlockHeight = transaction.lastValidBlockHeight ? transaction.lastValidBlockHeight : lastValidBlockHeight;
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
      log(`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${SOLANA_URL}`);
      return signature;
    }
  };

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
      const proxyApi = new NeonProxyRpcApi(`${NEON_CORE_API_RPC_URL}/sol`);
      setProxyApi(proxyApi);
      const {
        provider,
        chainId,
        solanaUser,
        tokenMintAddress,
        programAddress
      } = await proxyApi.init(publicKey!);
      setChainId(chainId);
      setProvider(provider);
      setSolanaUser(solanaUser);
      setEvmProgramAddress(programAddress);
      setTokenMint(tokenMintAddress);
    })();
  }, [publicKey]);

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

  useEffect(() => {
    const getAddresses = async () => {
      try {
        const addresses = await getTokensList(PROXY_ENV);
        setAddresses(addresses);
      } catch (_) {
        const addresses = tokens(PROXY_ENV);
        setAddresses(addresses);
      }
    };
    getAddresses().then();
  }, []);

  return (
    <ProxyConnectionContext.Provider value={{
      chainId: chainId!,
      tokenMint: tokenMint!,
      neonEvmProgram: neonEvmProgram!,
      solanaUser: solanaUser!,
      proxyApi: proxyApi!,
      provider: provider!,
      walletBalance,
      addresses,
      sendTransaction,
      getWalletBalance
    }}>
      {children}
    </ProxyConnectionContext.Provider>
  );
};

export const useProxyConnection = () => useContext(ProxyConnectionContext);
