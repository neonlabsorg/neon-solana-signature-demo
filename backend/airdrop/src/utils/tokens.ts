import {
  Commitment,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from '@solana/spl-token';
import { parseUnits } from 'ethers';
import { ResponseError } from '@utils/error';
import bs58 from 'bs58';
import { Big } from 'big.js';

export const AMOUNT_LIMIT = 20;
export const AMOUNT_CURVE_LIMIT = 300;
export const AMOUNT_SOL_LIMIT = 0.5;
export const AIRDROP_SOL_LIMIT = 0.1;
export const EXCLUDED_TOKENS = [`So11111111111111111111111111111111111111112`];

export async function transferTokens(connection: Connection, bankWallet: Keypair, wallet: PublicKey, tokenAddress: PublicKey, amount: bigint, isPancakeSwapToken = false): Promise<string> {
  try {
    const feePayer = wallet;
    const tokenMint = await getMint(connection, tokenAddress);
    const bankTokenAddress = getAssociatedTokenAddressSync(tokenMint.address, bankWallet.publicKey);
    const bankAccount = await getAccount(connection, bankTokenAddress);
    if (bankAccount && bankAccount.amount < amount) {
      throw new Error(`Low bank account balance`);
    }
    const [walletTokenAddress, tokenAccount, ataInstruction] = await getATAInstruction(connection, feePayer, tokenMint.address, wallet);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: feePayer
    });
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    if (tokenAccount) {
      const amount = new Big(tokenAccount.amount.toString()).div(10 ** tokenMint.decimals);
      const excludedToken = EXCLUDED_TOKENS.includes(tokenAddress.toBase58());
      if (!excludedToken && (isPancakeSwapToken && amount.gte(AMOUNT_LIMIT) ||
        !isPancakeSwapToken && amount.gte(AMOUNT_CURVE_LIMIT)) ||
        excludedToken && amount.gte(AMOUNT_SOL_LIMIT)) {
        throw new Error(`Failed: the address has enough tokens: ${amount.toString()}`);
      }
    }
    if (ataInstruction) {
      transaction.add(ataInstruction);
    }
    transaction.add(SystemProgram.transfer({
      fromPubkey: wallet,
      toPubkey: bankWallet.publicKey,
      lamports: 5e3
    }));
    transaction.add(createTransferCheckedInstruction(
      bankTokenAddress,
      tokenAddress,
      walletTokenAddress,
      bankWallet.publicKey,
      parseUnits(amount.toString(), tokenMint.decimals),
      tokenMint.decimals
    ));
    transaction.partialSign(bankWallet);
    return bs58.encode(transaction.serialize({ requireAllSignatures: false }));
  } catch (e: any) {
    const error = e.message ? e.message : e.name;
    if (e instanceof TokenAccountNotFoundError) {
      throw new ResponseError({
        message: `Failed: unknown token: ${tokenAddress.toBase58()}`,
        payload: { error }
      });
    }
    throw new ResponseError({
      message: `Failed: failed to retrieve the transaction`,
      payload: { error }
    });
  }
}

export async function getATAInstruction(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  commitment?: Commitment,
  confirmOptions?: ConfirmOptions,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<[PublicKey, Account | null, TransactionInstruction | null]> {
  const associatedToken = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId);
  let account: Account | null = null;
  let instruction: TransactionInstruction | null = null;
  try {
    account = await getAccount(connection, associatedToken, commitment, programId);
  } catch (error: unknown) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      instruction = createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint, programId, associatedTokenProgramId);
    }
  }

  return [associatedToken, account, instruction];
}
