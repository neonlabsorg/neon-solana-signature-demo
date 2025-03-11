import { Router } from 'express';
import { airdropTransactionState, airdropTransaction } from '@services/airdrop/airdrop.controllers';

const airdropRouter = Router();

airdropRouter.post(``, airdropTransaction);
airdropRouter.post(`/state`, airdropTransactionState);

export { airdropRouter };
