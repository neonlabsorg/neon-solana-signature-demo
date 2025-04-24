import { Router } from 'express';
import { pancakeTokens } from '@services/tokens/pankace/controllers';
import { curveTokens } from '@services/tokens/curve/controllers';

const tokensRouter = Router();

/*
* :network = 'localnet' | 'devnet' | 'mainnet'
* */
tokensRouter.get(`/:network`, pancakeTokens);
tokensRouter.get(`/curve/:network`, curveTokens);

export { tokensRouter };
