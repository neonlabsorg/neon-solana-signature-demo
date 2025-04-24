import { curveAddressesCurvestand, curveAddressesDevnet } from '@data';
import { CSPLToken, CurveAddresses, SolanaEnvironment } from '@models';
import { Request, Response } from 'express';
import { ResponseError } from '@utils/error';
import { log } from '@utils/log';

export function addressesList(env: SolanaEnvironment): CurveAddresses {
  let contracts: any = curveAddressesCurvestand.contracts;
  let airdrop: any = curveAddressesCurvestand.airdrop;
  let tokens: CSPLToken[] = curveAddressesCurvestand.tokens;

  switch (env) {
    case SolanaEnvironment.curvestand:
    case SolanaEnvironment.localnet:
      contracts = curveAddressesCurvestand.contracts;
      airdrop = curveAddressesCurvestand.airdrop;
      tokens = curveAddressesCurvestand.tokens;
      break;
    case SolanaEnvironment.devnet:
      contracts = curveAddressesDevnet.contracts;
      airdrop = curveAddressesDevnet.airdrop;
      tokens = curveAddressesDevnet.tokens;
      break;
    case SolanaEnvironment.mainnet:
    default:
      throw new ResponseError({ code: 404, message: `Error: Network ${env} doesn't exist` });
  }

  return { contracts, airdrop, tokens };
}

export async function curveTokens(req: Request, res: Response): Promise<any> {
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
