import React, { useMemo, useState } from 'react';
import { Transaction } from '@solana/web3.js';
import { SPLToken } from '@neonevm/token-transfer-core';
import Modal from 'react-modal';
import bs58 from 'bs58';
import TokenItem from '../TokenItem/TokenItem';
import { tokenAirdropTransaction } from '../../../api/tokens';
import { useProxyConnection } from '../../../wallet/Connection';
import { CTokenBalance, TransactionResponse } from '../../../models';
import { PROXY_ENV } from '../../../environments';
import './TokensModal.css';

Modal.setAppElement('#root');

interface Props {
  openModal: boolean;
  closeModal: <T>(t?: T) => void;
  tokensList: CTokenBalance[];
  excludedToken: string;

  updateTokenBalance(token: SPLToken): Promise<void>;
}

export const EXCLUDED_TOKENS = [`So11111111111111111111111111111111111111112`];
export const AMOUNT_AIRDROP = 20;
export const AMOUNT_REQUEST = 10;
export const AMOUNT_SOL_AIRDROP = 0.5;
export const AMOUNT_SOL_REQUEST = 0.1;

function TokensModal(props: Props) {
  const { openModal, closeModal, tokensList, excludedToken, updateTokenBalance } = props;
  const {
    solanaUser,
    sendTransaction
  } = useProxyConnection();
  const [isLoading, setLoading] = useState<boolean>(false);

  const tokenSelect = (token: CTokenBalance): void => {
    closeModal(token);
  };

  const tokenAirdrop = async ({ token }: CTokenBalance): Promise<TransactionResponse> => {
    try {
      setLoading(true);
      const amount = EXCLUDED_TOKENS.includes(token.address_spl) ? AMOUNT_SOL_REQUEST : AMOUNT_REQUEST;
      const {
        transaction,
        message,
        payload
      } = await tokenAirdropTransaction(solanaUser.publicKey, token, PROXY_ENV, amount);
      if (transaction) {
        const recoveredTransaction = Transaction.from(bs58.decode(transaction));
        await sendTransaction(recoveredTransaction);
        await updateTokenBalance(token);
      }
      return { transaction, message, payload };
    } catch (e) {
      console.log(e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const firstTokenAirdrop = async (): Promise<void> => {
    if (tokens.length) {
      const [token] = tokens;
      await tokenAirdrop(token);
    }
  };

  const handleCloseModal = (): void => {
    closeModal();
  };

  const tokens = useMemo<CTokenBalance[]>(() => {
    return tokensList.filter(t => t.token.symbol !== excludedToken);
  }, [tokensList, excludedToken]);

  const isShowNotification = useMemo(() => {
    return !!solanaUser && tokens.some(t => AMOUNT_AIRDROP > (t.balance?.uiAmount ?? 0));
  }, [tokens, solanaUser]);

  return (
    <Modal isOpen={openModal} onRequestClose={handleCloseModal}
           className="Modal"
           overlayClassName="Overlay"
           contentLabel="Tokens list">
      <div className="tokens-modal">
        <div className="tokens-header">
          <h3>Select token</h3>
          <button className="button-close" type="button" onClick={handleCloseModal}>
            <img src="/assets/icons/close.svg" alt="Close" />
          </button>
        </div>
        <div className="tokens-content">
          {tokens.map(((token, key) =>
            <TokenItem token={token} tokenSelect={tokenSelect} tokenAirdrop={tokenAirdrop}
                       key={key} />))}
{/*          {isShowNotification && <div className="notification mt-[20px]">
            <div className="icon">
              <img src="/assets/icons/gift.svg" alt="Gift..." />
            </div>
            <div className="notification-description">
              <h4>Get tokens for tests</h4>
              <p>For one wallet, you can request 10 test tokens per minute.</p>
              <p>{`You can get up to ${AMOUNT_AIRDROP} test tokens.`}</p>
            </div>
          </div>}*/}
        </div>
      </div>
    </Modal>
  );
}

export default TokensModal;
