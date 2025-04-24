import { addressesCurvestand, addressesDevnet, addressesMainnet } from '@data';
import { Addresses, CSPLToken, SolanaEnvironment } from '@models';
import { Request, Response } from 'express';
import { ResponseError } from '@utils/error';
import { log } from '@utils/log';

export function addressesList(env: SolanaEnvironment): Addresses {
  let swap: any = addressesCurvestand.swap;
  let airdrop: any = addressesCurvestand.airdrop;
  let tokensV1: CSPLToken[] = addressesCurvestand.tokensV1;
  let tokensV2: CSPLToken[] = addressesCurvestand.tokensV2;

  switch (env) {
    case SolanaEnvironment.curvestand:
    case SolanaEnvironment.localnet:
      swap = addressesCurvestand.swap;
      airdrop = addressesCurvestand.airdrop;
      tokensV1 = addressesCurvestand.tokensV1;
      tokensV2 = addressesCurvestand.tokensV2;
      break;
    case SolanaEnvironment.devnet:
      swap = addressesDevnet.swap;
      airdrop = addressesDevnet.airdrop;
      tokensV1 = addressesDevnet.tokensV1;
      tokensV2 = addressesDevnet.tokensV2;
      break;
    case SolanaEnvironment.mainnet:
      swap = addressesMainnet.swap;
      airdrop = addressesMainnet.airdrop;
      tokensV1 = addressesMainnet.tokensV1;
      tokensV2 = addressesMainnet.tokensV2;
      break;
    default:
      throw new ResponseError({ code: 404, message: `Error: Network ${env} doesn't exist` });
  }

  return { swap, airdrop, tokensV1, tokensV2 };
}

export async function pancakeTokens(req: Request, res: Response): Promise<any> {
  try {
    const { network } = req.params;
    const body = addressesList(network as SolanaEnvironment);
    res.status(200).json(body);
  } catch (err: any) {
    log(err);
    const code = err.code ?? 400;
    res.status(code).json({ message: err?.message, payload: err.payload });
  }
}
