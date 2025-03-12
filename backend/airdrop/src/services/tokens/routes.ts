import { Router } from 'express';
import { tokens } from '@services/tokens/controllers';

const tokensRouter = Router();

/*
* :network = 'localnet' | 'devnet' | 'mainnet'
* */
tokensRouter.get(`/:network`, tokens);

export { tokensRouter };
