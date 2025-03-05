import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../layout/Layout.tsx';
import SwapForm from '../swap/SwapForm.tsx';
import FormTabs from '../swap/components/FormTabs/FormTabs.tsx';
import { useProxyConnection } from '../wallet/Connection.tsx';
import { SwapTokenData, UITab } from '../models';
import './App.css';
import {
  approveTokensForSwapTransactionData, approveTokenV1Instruction, approveTokenV2Instruction,
  pancakeSwapTransactionData,
  swapTokensMultipleWithGasFee,
  transferTokenToNeonTransactionData,
  transferTokenToSolanaTransactionData
} from '../api/swap';
import { tokens } from '../data/tokens';
import { PROXY_ENV } from '../environments';
import { EstimateScheduledTransaction } from '@neonevm/solana-sign';

const { tokensV2, tokensV1 } = tokens(PROXY_ENV);

function App() {
  const tabs: UITab[] = [
    { id: 0, title: 'v1', disabled: false },
    { id: 1, title: 'v1-2', disabled: true },
    { id: 2, title: 'v2', disabled: false }
  ];
  const [tab, setTab] = useState<UITab>(tabs[0]);
  const { publicKey } = useWallet();
  const { getWalletBalance } = useProxyConnection();

  const v1DataMethod = async (params: SwapTokenData): Promise<EstimateScheduledTransaction[]> => {
    const claimTransaction = transferTokenToNeonTransactionData(params);
    const approveSwapTransaction = approveTokensForSwapTransactionData(params);
    const swapTransaction = pancakeSwapTransactionData(params);
    const transferSolanaTransaction = await transferTokenToSolanaTransactionData(params);
    return [
      claimTransaction,
      approveSwapTransaction,
      swapTransaction,
      transferSolanaTransaction
    ];
  };

  const v2DataMethod = async (params: SwapTokenData): Promise<EstimateScheduledTransaction[]> => {
    const approveSwapTransaction = approveTokensForSwapTransactionData(params);
    const swapTransaction = pancakeSwapTransactionData(params);
    return [
      approveSwapTransaction,
      swapTransaction
    ];
  };

  const handleSelect = (tab: UITab): void => {
    setTab(_ => tab);
  };


  useEffect(() => {
    getWalletBalance().catch(console.log);
  }, [publicKey]);

  return (
    <>
      <Layout>
        <div className="max-w-[624px]">
          <FormTabs tabs={tabs} tab={tab} selectTab={handleSelect}></FormTabs>
          {tab.id === 0 && <SwapForm tokensList={tokensV1}
                                     dataMethod={v1DataMethod}
                                     approveMethod={approveTokenV1Instruction}
                                     swapMethod={swapTokensMultipleWithGasFee}></SwapForm>}
          {tab.id === 1 && <SwapForm tokensList={tokensV2}
                                     dataMethod={v2DataMethod}
                                     approveMethod={approveTokenV2Instruction}
                                     swapMethod={swapTokensMultipleWithGasFee}></SwapForm>}
          {tab.id === 2 && <SwapForm tokensList={tokensV2}
                                     dataMethod={v2DataMethod}
                                     approveMethod={approveTokenV2Instruction}
                                     swapMethod={swapTokensMultipleWithGasFee}></SwapForm>}
        </div>
      </Layout>
    </>
  );
}

export default App;
