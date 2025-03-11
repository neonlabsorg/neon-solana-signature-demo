import { NextFunction, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { transferTokens } from '@utils/tokens';
import { solanaBankWallet, solanaConnection } from '@utils/solana';
import { AIRDROP_LIMIT, TRANSACTION_INTERVAL } from '@environment';
import { ResponseError } from '@utils/error';

const storage = new Map<string, number>();

export async function airdropTransaction(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const { wallet, amount, token, network } = req.body;
    const connection = solanaConnection(network);
    const bankWallet = solanaBankWallet(network);
    const walletAddress = new PublicKey(wallet);
    const tokenAddress = new PublicKey(token);
    if (Number(amount) > Number(AIRDROP_LIMIT)) {
      throw new ResponseError({
        message: `Failed: trying to get a large amount`,
        payload: { limit: AIRDROP_LIMIT }
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
    const transaction = await transferTokens(connection, bankWallet, walletAddress, tokenAddress, amount);
    res.status(200).json({ transaction });
    storage.set(wallet, Math.round(Date.now() / 1e3));
  } catch (err: any) {
    console.log(err.message);
    const code = err.code ?? 400;
    res.status(code).json({ message: err?.message, payload: err?.payload });
  }
}
