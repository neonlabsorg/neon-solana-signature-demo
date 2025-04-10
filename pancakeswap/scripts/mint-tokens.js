const { ethers, network } = require('hardhat');
const { treasuryPoolAddressSync, getProxyState } = require(`@neonevm/solana-sign`);
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { default: bs58 } = require('bs58');
const {
  asyncTimeout,
  transferSolToMemberWallet,
  transferNeonTokenToBankAccount,
  transferERC20TokenToBankAccount,
  transferTokenToMemberWallet, deployerAirdrop
} = require('./utils');
const { addresses } = require('../artifacts/addresses');
require('dotenv').config();

const memberWallets = JSON.parse(process.env.TEST_SOLANA_WALLETS);

async function main() {
  console.log(`Network name: ${network.name}`);
  const solanaUrl = process.env.SOLANA_RPC_NODE;
  const connection = new Connection(solanaUrl);
  const solanaWallet = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_WALLET));
  await transferSolToMemberWallet(connection, solanaWallet.publicKey, 1);
  const contractV1 = 'contracts/erc20-for-spl/ERC20ForSPL.sol:ERC20ForSplMintable';
  const contractV2 = 'contracts/erc20-for-spl-v2/token/ERC20ForSpl/erc20_for_spl.sol:ERC20ForSplMintable';

  await createPoolDeposit(connection, 2);

  const deployer = (await ethers.getSigners())[0];
  await deployerAirdrop(deployer, 10000);

  for (const token of addresses.tokensV1) {
    if (token.symbol === 'wNEON') {
      await transferNeonTokenToBankAccount(connection, solanaWallet, deployer, token, 1000, addresses.swap.neonTokenTransfer);
    } else {
      await transferERC20TokenToBankAccount(connection, solanaWallet, deployer, token, 10000, contractV1);
    }
    for (const wallet of memberWallets) {
      const memberWallet = new PublicKey(wallet);
      await transferSolToMemberWallet(connection, memberWallet, 1);
      await transferTokenToMemberWallet(connection, solanaWallet, memberWallet, token, 1);
      await asyncTimeout(2e3);
    }
  }

  for (const token of addresses.tokensV2) {
    await transferERC20TokenToBankAccount(connection, solanaWallet, deployer, token, 10000, contractV2);
    for (const wallet of memberWallets) {
      const memberWallet = new PublicKey(wallet);
      await transferTokenToMemberWallet(connection, solanaWallet, memberWallet, token, 1);
    }
  }
}

async function createPoolDeposit(connection, amount) {
  const result = await getProxyState(process.env.NEON_EVM_NODE);
  const count = result.proxyStatus.neonTreasuryPoolCount;
  for (let index = 0; index < count; index++) {
    const [publicKey] = treasuryPoolAddressSync(result.evmProgramAddress, index);
    await transferSolToMemberWallet(connection, publicKey, amount, 1e3);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
