import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useProxyConnection } from '../wallet/Connection.tsx';
import { PROXY_ENV } from '../environments';
import './layout.css';

const Header = () => {
  const { walletBalance } = useProxyConnection();

  return <header className={'flex flex-row justify-center transition z-10'}>
    <div className={'flex flex-row items-left justify-between w-full max-w-2xl p-2'}>
      <div className="logo">
        <img src="/assets/logo.svg" width="32" height="32" alt="Neon" />
        <span><strong>Swap</strong> Demo (<span className='capitalize'>{PROXY_ENV}</span>)</span>
      </div>
      <div className={'flex flex-row gap-[8px] items-center'}>
        <div className="balance">{walletBalance > 0 && `${(walletBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`}</div>
        <WalletMultiButton />
      </div>
    </div>
  </header>;
};

export default Header;
