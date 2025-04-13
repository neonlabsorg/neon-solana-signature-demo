import { delay } from '@neonevm/solana-sign';
import { useMemo, useState } from 'react';
import { tokenIcons } from '../../../data/tokens';
import { PROXY_ENV } from '../../../environments';
import { useProxyConnection } from '../../../wallet/Connection';
import { CTokenBalance, TransactionResponse } from '../../../models';
import { lastAridropTransactionState } from '../../../api/tokens';
import { AMOUNT_AIRDROP, AMOUNT_SOL_AIRDROP, EXCLUDED_TOKENS } from '../TokensModal/TokensModal';
import './TokenItem.css';

const TRANSACTION_INTERVAL = 60;

function TokenItem({ token, tokenSelect, tokenAirdrop }: {
  token: CTokenBalance;

  tokenSelect(token: CTokenBalance): void;
  tokenAirdrop(token: CTokenBalance): Promise<TransactionResponse>;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'none'>('none');
  const { addresses, solanaUser } = useProxyConnection();

  const tokenName = useMemo(() => {
    return token.token.name ? token.token.name : '';
  }, [token]);

  const tokenSymbol = useMemo(() => {
    return token.token.symbol ? token.token.symbol : '';
  }, [token]);

  const tokenBalance = useMemo(() => {
    const symbol = token.token.symbol ? token.token.symbol : '';
    const balance = token.balance?.uiAmount ?? '';
    return balance ? `${balance} ${symbol}` : '0';
  }, [token, token.balance]);

  const title = useMemo(() => {
    switch (state) {
      case 'failed':
        return `Too many token requests, please wait`;
    }
    return `Click to get test tokens`;
  }, [state]);

  const icon = useMemo(() => {
    switch (state) {
      case 'failed':
        return `/assets/icons/warning-white.svg`;
    }
    return `/assets/icons/gift.svg`;
  }, [state]);

  const warningClass = useMemo(() => {
    switch (state) {
      case 'failed':
        return `warning`;
    }
    return ``;
  }, [state]);

  const tokenIcon = useMemo(() => {
    const symbol = tokenSymbol.toLowerCase();
    const icon = Object.prototype.hasOwnProperty.call(tokenIcons, symbol) ? tokenIcons[symbol] : 'token.svg';
    return `/tokens/${icon}`;
  }, [tokenSymbol]);

  const showAirdrop = useMemo(() => {
    const balance = token.balance?.uiAmount ?? 0;
    const excludedToken = EXCLUDED_TOKENS.includes(token.token.address_spl);
    return !!solanaUser &&
      !!addresses.airdrop?.includes(token.token.address_spl) &&
      (!excludedToken && AMOUNT_AIRDROP > balance ||
        excludedToken && AMOUNT_SOL_AIRDROP > balance);
  }, [token.balance?.uiAmount, token.token.address_spl, solanaUser, addresses.airdrop]);

  const delayTransaction = async (timestamp: number): Promise<void> => {
    const remainingTime = Math.floor(Date.now() / 1e3) - timestamp;
    if (TRANSACTION_INTERVAL - remainingTime > 0) {
      await delay((TRANSACTION_INTERVAL - remainingTime) * 1e3);
    }
  };

  const handleSelect = (): void => tokenSelect(token);
  const handleAirdrop = async (): Promise<void> => {
    setLoading(true);
    setState('loading');
    try {
      const { transaction, message, payload } = await tokenAirdrop(token);
      if (transaction) {
        setState('success');
        const { lastTrx } = await lastAridropTransactionState(solanaUser.publicKey, token.token, PROXY_ENV);
        await delayTransaction(lastTrx);
      } else if (payload && Object.prototype.hasOwnProperty.call(payload, 'lastTrx')) {
        setState('failed');
        await delayTransaction(payload['lastTrx']);
      } else {
        throw new Error(message);
      }
    } catch (_) {
      setState('failed');
      const { lastTrx } = await lastAridropTransactionState(solanaUser.publicKey, token.token, PROXY_ENV);
      await delayTransaction(lastTrx);
    }
    setLoading(false);
    setState('none');
  };

  return (
    <div className="flex flex-col gap-[6px] w-full">
      <div className='flex items-center flex-row gap-[6px] w-full'>
        <button type="button" className="token-item" onClick={handleSelect} disabled={loading}>
          <div className="token-content">
            <div className="token-icon">
              <img src={tokenIcon} width="36px" height="36px" alt={tokenSymbol} />
            </div>
            <div className="token-name">{tokenName}</div>
          </div>
          <div className="token-amount">{tokenBalance}</div>
        </button>
        {showAirdrop &&
          <button type="button" className="button-airdrop" onClick={handleAirdrop} disabled={loading}
                  title="Request tokens">
            {state === 'none' && <img src="/assets/icons/gift.svg" alt="Gift..." />}
            {state === 'loading' && <div className="animate-spin">
              <img src="/assets/icons/loading.svg" alt="Loading..." />
            </div>}
            {state === 'success' && <img src="/assets/icons/check.svg" alt="Success" />}
            {state === 'failed' && <img src="/assets/icons/warning.svg" alt="Failed" />}
          </button>}
      </div>

      {showAirdrop &&
        <button type="button" className={`notification ${warningClass} w-full`} onClick={handleAirdrop}
                disabled={loading}>
          <div className="icon">
            <img src={icon} alt="Gift..." />
          </div>
          <div className="notification-description">
            <h4>{title}</h4>
            <p>For one wallet, you can request 10 test tokens per minute.</p>
            <p>{`You can get up to ${AMOUNT_AIRDROP} test tokens.`}</p>
          </div>
        </button>}
    </div>
  );
}

export default TokenItem;
