import express, { Express, Request, Response } from 'express';
import { SERVER_PORT } from '@environment';
import { errorHandler, logger } from '@utils/log';
import { airdropRouter } from '@services/airdrop/airdrop.routes';
import { tokensRouter } from '@services/tokens/routes';
import { config } from 'dotenv';
import cors from 'cors';

config();

const app: Express = express();
const port = SERVER_PORT || 3000;

app.use(logger);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(errorHandler);

app.use('/api/v1/airdrop', airdropRouter);
app.use('/api/v1/tokens', tokensRouter);

app.get('/status', (req: Request, res: Response) => {
  res.json({ status: 'Ok' });
});

app.listen(port, () => console.log(`[server]: Server is running at http://localhost:${port}`));
