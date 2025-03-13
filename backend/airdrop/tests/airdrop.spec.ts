import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { get, post } from '../src/utils/rest';
import { sendSolanaTransaction, solanaAirdrop, solanaConnection } from '../src/utils/solana';
import { CSPLToken, SolanaEnvironment } from '../src/models';
import { AIRDROP_LIMIT, SOLANA_WALLET } from '../src/environment';
import { delay } from '../src/utils/delay';

const apiUrl = `http://localhost:7005/api/v1`;
let connection: Connection;

beforeAll(async () => {
  connection = solanaConnection(SolanaEnvironment.localnet);
  await delay(1e3);
});

describe('Check airdrop', () => {
  it(`Request wrong token addresses`, async () => {
    const network = `testnet`;
    const response = await get(`${apiUrl}/tokens/${network}`);
    expect(response.message).toBe(`Error: Network ${network} doesn't exist`);
  });

  it(`Airdrop tokens for new account`, async () => {
    const keypair = new Keypair();
    await solanaAirdrop(connection, keypair.publicKey, 1e9);
    const { tokensV1 } = await get(`${apiUrl}/tokens/localnet`);

    const [token]: CSPLToken[] = tokensV1;
    const { transaction } = await post(`${apiUrl}/airdrop`, {
      wallet: keypair.publicKey.toBase58(),
      token: token.address_spl,
      amount: 1
    });

    const recoveredTransaction = Transaction.from(bs58.decode(transaction));
    await sendSolanaTransaction(connection, recoveredTransaction, [keypair], true, { skipPreflight: false });
    const ataAddress = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), keypair.publicKey);
    const { value } = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
    expect(Number(value?.amount)).toBeGreaterThan(0);
  });

  it(`Airdrop tokens for exist account`, async () => {
    const keypair = Keypair.fromSecretKey(bs58.decode(SOLANA_WALLET));
    await solanaAirdrop(connection, keypair.publicKey, 1e9);
    const { tokensV1 } = await get(`${apiUrl}/tokens/localnet`);
    const [_, token]: CSPLToken[] = tokensV1;
    const ataAddress = getAssociatedTokenAddressSync(new PublicKey(token.address_spl), keypair.publicKey);
    let balanceBefore: string = '0';
    try {
      const { value } = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
      balanceBefore = value?.amount ?? '0';
    } catch (e) {
    }
    const { transaction } = await post(`${apiUrl}/airdrop`, {
      wallet: keypair.publicKey.toBase58(),
      token: token.address_spl,
      amount: 1
    });

    const recoveredTransaction = Transaction.from(bs58.decode(transaction));
    await sendSolanaTransaction(connection, recoveredTransaction, [keypair], true, { skipPreflight: false });
    const { value: balanceAfter } = await connection.getTokenAccountBalance(ataAddress, 'confirmed');
    expect(Number(balanceAfter?.amount)).toBeGreaterThan(Number(balanceBefore));
  });

  it(`Airdrop tokens going over the limit`, async () => {
    const keypair = Keypair.fromSecretKey(bs58.decode(SOLANA_WALLET));
    const [token] = (await get(`${apiUrl}/tokens/localnet`))?.tokensV1;
    const response = await post(`${apiUrl}/airdrop`, {
      wallet: keypair.publicKey.toBase58(),
      token: token.address_spl,
      amount: 1
    });
    expect(response.message).toBe(`Failed: request limit exceeded`);
  });

  it(`Airdrop tokens large amount`, async () => {
    const keypair = new Keypair();
    const [token] = (await get(`${apiUrl}/tokens/localnet`))?.tokensV1;
    const response = await post(`${apiUrl}/airdrop`, {
      wallet: keypair.publicKey.toBase58(),
      token: token.address_spl,
      amount: Number(AIRDROP_LIMIT) + 1
    });
    expect(response.message).toBe(`Failed: trying to get a large amount`);
  });

  it(`Airdrop unknown token`, async () => {
    const keypair = new Keypair();
    const tokenKey = PublicKey.unique();
    const response = await post(`${apiUrl}/airdrop`, {
      wallet: keypair.publicKey.toBase58(),
      token: tokenKey,
      amount: 1
    });
    expect(response.message).toBe(`Failed: failed to retrieve the transaction`);
  });
});
