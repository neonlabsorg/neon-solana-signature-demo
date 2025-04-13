import { SPLToken } from '@neonevm/token-transfer-core';
import { useMemo, useState } from 'react';
import AmountInput from 'react-currency-input-field';
import { Big } from 'big.js';
import { CTokenBalance } from '../../../models';
import { tokenIcons } from '../../../data/tokens';
import TokensModal from '../TokensModal/TokensModal';
import './TokenField.css';

type Props = {
  data: {
    token: string;
    amount: string;
  },
  type: 'from' | 'to';
  maxAmount: number;
  label: string;
  tokensList: CTokenBalance[];
  excludedToken: string;
  disabled?: boolean;
  loading: boolean;
  setTokenData(type: 'from' | 'to', data: { token: string; amount: string; }): void;
  updateTokenBalance(token: SPLToken): Promise<void>;
};

export const TokenField = (props: Props) => {
  const {
    data, tokensList, type,
    label, setTokenData, updateTokenBalance, excludedToken, disabled, loading, maxAmount
  } = props;
  const [openModal, setOpenModal] = useState(false);

  const token = useMemo(() => {
    const symbol = data.token ? data.token : '';
    const id = tokensList.findIndex(i => i.token.symbol === symbol);
    if (id > -1) {
      return tokensList[id];
    }
    return null;
  }, [data, tokensList]);

  const tokenIcon = useMemo(() => {
    const symbol = token?.token.symbol.toLowerCase();
    const icon = symbol && tokenIcons[symbol] ? tokenIcons[symbol] : 'token.svg';
    return `/tokens/${icon}`;
  }, [token]);

  const tokenName = useMemo(() => {
    return token?.token?.name;
  }, [token]);

  const tokenBalance = useMemo(() => {
    if (token) {
      const balance = token.balance?.uiAmount ?? '';
      return balance ? balance : '0';
    }
    return `0`;
  }, [data, token, loading]);

  const handleOpenModal = (): void => {
    setOpenModal(true);
  };

  const handleCloseModal = (token?: CTokenBalance): void => {
    if (token) {
      const amount = data.amount ? new Big(new Big(data.amount).toFixed(token.token.decimals)).toString() : '';
      setTokenData(type, { amount, token: token.token.symbol });
    }
    setOpenModal(false);
  };

  const handleInput = (amount?: string): void => {
    const b = Number(amount);
    const a = b < 0 ? '0' : b > maxAmount ? maxAmount.toString() : amount;
    const c = a ? a : '';
    setTokenData(type, { amount: c, token: data.token });
  };

  return (
    <>
      <div className="form-label">
        <label>{label}</label>
        <div className="wallet-amount">
          <div className="button-back">
            <img src="/assets/icons/wallet.svg" alt="" />
          </div>
          <span className="amount">{tokenBalance}</span>
        </div>
      </div>
      <div className="token-field">
        <div className="token-field-item icon">
          <button type="button" className="token-button" onClick={handleOpenModal}>
            <div className="token-icon">
              <img src={tokenIcon} width="36px" height="36px" alt="" />
            </div>
            <span className="token-name whitespace-nowrap">{tokenName}</span>
          </button>
        </div>
        <div className="token-field-item amount w-full relative">
          {loading && <div className="absolute right-[-18px] top-[9px] animate-spin">
            <img src="/assets/icons/loading.svg" width="15px" height="15px" alt="" />
          </div>}
          <AmountInput decimalsLimit={token?.token?.decimals} onValueChange={handleInput}
                       value={data.amount} placeholder="0.00" disabled={disabled}
                       className={`transition-all ${loading ? 'opacity-75' : ''}`}
                       intlConfig={{ locale: 'en-UA' }} />
        </div>
      </div>
      <TokensModal excludedToken={excludedToken} tokensList={tokensList} openModal={openModal}
                   closeModal={handleCloseModal} updateTokenBalance={updateTokenBalance} />
    </>
  );
};
