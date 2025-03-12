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

export const AMOUNT_AIRDROP = 20;

export async function transferTokens(connection: Connection, bankWallet: Keypair, wallet: PublicKey, tokenAddress: PublicKey, amount: bigint): Promise<string> {
  try {
    const feePayer = wallet;
    const tokenMint = await getMint(connection, tokenAddress);
    const bankTokenAddress = getAssociatedTokenAddressSync(tokenMint.address, bankWallet.publicKey);
    const [walletTokenAddress, tokenAccount, ataInstruction] = await getATAInstruction(connection, feePayer, tokenMint.address, wallet);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: feePayer
    });
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    if (tokenAccount) {
      const amount = new Big(tokenAccount.amount.toString()).div(10 ** tokenMint.decimals);
      if (amount.gte(AMOUNT_AIRDROP)) {
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
    throw new ResponseError({
      message: `Failed: failed to retrieve the transaction`,
      payload: { error: e.message }
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
