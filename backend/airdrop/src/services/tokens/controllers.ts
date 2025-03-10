import { addressesCurvestand, addressesDevnet, addressesMainnet } from '@data';
import { Addresses, CSPLToken, SolanaEnvironment } from '@models';
import { Request, Response } from 'express';

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
      throw new Error(`Network doesn't exist`);
  }

  return { swap, airdrop, tokensV1, tokensV2 };
}

export async function tokens(req: Request, res: Response): Promise<any> {
  try {
    const { network } = req.params;
    const body = await addressesList(network as SolanaEnvironment);
    res.status(200).json(body);
  } catch (err: any) {
    console.log(err);
    res.status(400).json({ message: err?.message });
  }
}
