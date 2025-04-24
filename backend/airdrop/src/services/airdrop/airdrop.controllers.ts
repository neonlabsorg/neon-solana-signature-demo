import { NextFunction, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AIRDROP_LIMIT, TRANSACTION_INTERVAL } from '@environment';
import { AIRDROP_SOL_LIMIT, EXCLUDED_TOKENS, transferTokens } from '@utils/tokens';
import { solanaBankWallet, solanaConnection } from '@utils/solana';
import { log } from '@utils/log';
import { ResponseError } from '@utils/error';
import { addressesList } from '@services/tokens/pankace/controllers';

const storage = new Map<string, number>();

export async function airdropTransactionState(req: Request, res: Response): Promise<any> {
  const { wallet, token, network } = req.body;
  const lastTrx = storage.has(wallet) ? storage.get(wallet) : Math.floor(Date.now() / 1000);
  res.status(200).json({ lastTrx, wallet, token, network });
}

export async function airdropTransaction(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const { wallet, amount, token, network } = req.body;
    const connection = solanaConnection(network);
    const bankWallet = solanaBankWallet(network);
    const walletAddress = new PublicKey(wallet);
    const tokenAddress = new PublicKey(token);
    const { tokensV1, tokensV2 } = addressesList(network);
    const isPancakeSwapToken = (tokensV1.some(i => i.address_spl === token) ||
      tokensV2.some(i => i.address_spl === token));
    if (isPancakeSwapToken && Number(amount) > Number(AIRDROP_LIMIT)) {
      throw new ResponseError({
        message: `Failed: trying to get a large amount`,
        payload: { limit: AIRDROP_LIMIT }
      });
    } else if (EXCLUDED_TOKENS.includes(token) && Number(amount) > AIRDROP_SOL_LIMIT) {
      throw new ResponseError({
        message: `Failed: trying to get a large amount`,
        payload: { limit: AIRDROP_SOL_LIMIT }
      });
    }
    if (storage.has(wallet)) {
      const lastTrx = storage.get(wallet)!;
      const now = Math.round(Date.now() / 1e3);
      if (lastTrx > (now - Number(TRANSACTION_INTERVAL))) {
        throw new ResponseError({
          code: 429,
          message: `Failed: request limit exceeded`,
          payload: { lastTrx }
        });
      }
    }
    const transaction = await transferTokens(connection, bankWallet, walletAddress, tokenAddress, amount, isPancakeSwapToken);
    res.status(200).json({ transaction });
    storage.set(wallet, Math.round(Date.now() / 1e3));
  } catch (err: any) {
    log(err.message);
    const code = err.code ?? 400;
    res.status(code).json({ message: err?.message, payload: err?.payload });
  }
}
