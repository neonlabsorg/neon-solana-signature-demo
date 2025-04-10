const { ethers, network, run } = require('hardhat');
const { deployPancakeswapExchange } = require('./deploy-pancakeswap-exchange');
const { deployERC20ForSPLMintable } = require('./deploy-tokens');
const { createPairAndAddLiquidity } = require('./create-liquidity-pools');
const { writeToFile, deployerAirdrop } = require('./utils');
require('dotenv').config();

async function main() {
  await run('compile');

  console.log(`\nNetwork name: ${network.name}`);

  if (!process.env.DEPLOYER_KEY) {
    throw new Error('\nMissing private key: DEPLOYER_KEY');
  }

  const deployer = (await ethers.getSigners())[0];
  await deployerAirdrop(deployer, 10000);

  const contractV1 = 'contracts/erc20-for-spl/ERC20ForSPL.sol:ERC20ForSplMintable';
  const contractV2 = 'contracts/erc20-for-spl-v2/token/ERC20ForSpl/erc20_for_spl.sol:ERC20ForSplMintable';

  // Deploy Pancakeswap exchnage contracts and WNEON
  const {
    pancakeFactoryAddress,
    pancakeRouterAddress,
    WNEONAddress,
    NEONAddress,
    token
  } = await deployPancakeswapExchange(deployer);

  const mintAuthority = deployer.address; // Set deployer as mint authority

  const wNeon = token;

  // Deploy TOKEN_A (ERC20ForSPLMintable)
  const tokenA = await deployERC20ForSPLMintable(
    'token_A',
    'Token A',
    'TOKEN_A',
    9,
    mintAuthority,
    contractV1
  );

  // Deploy TOKEN_B (ERC20ForSPLMintable)
  const tokenB = await deployERC20ForSPLMintable(
    'token_B',
    'Token B',
    'TOKEN_B',
    12,
    mintAuthority,
    contractV1
  );

  const tokenAv2 = await deployERC20ForSPLMintable(
    'token_Av2',
    'Token A (v2)',
    'TOKEN_Av2',
    9, // new version have limit of maximum 9 decimals, because Solana don't support more
    mintAuthority,
    contractV2
  );

  const tokenBv2 = await deployERC20ForSPLMintable(
    'token_Bv2',
    'Token B (v2)',
    'TOKEN_Bv2',
    9, // new version have limit of maximum 9 decimals, because Solana don't support more
    mintAuthority,
    contractV2
  );

  // Create WNEON-TOKEN_A pair and provide liquidity
  const pairAddressA = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    WNEONAddress,
    tokenA.address,
    2000,
    7333,
    contractV1
  );

  // Create WNEON-TOKEN_B pair and provide liquidity
  const pairAddressB = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    WNEONAddress,
    tokenB.address,
    5300,
    14530,
    contractV1
  );

  // Create TOKEN_A-TOKEN_B pair and provide liquidity
  const pairAddressAB = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    tokenA.address,
    tokenB.address,
    6345,
    53809,
    contractV1
  );

  // Create TOKEN_A-TOKEN_B pair and provide liquidity
  const pairAddressABv2 = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    tokenAv2.address,
    tokenBv2.address,
    30000,
    65000,
    contractV2
  );

  const wSymbol = wNeon.symbol.toLowerCase();
  const aSymbol = tokenA.symbol.toLowerCase();
  const bSymbol = tokenB.symbol.toLowerCase();
  const a2Symbol = tokenAv2.symbol.toLowerCase();
  const b2Symbol = tokenBv2.symbol.toLowerCase();

  const result = {
    tokensV1: [/*wNeon, */tokenA, tokenB],
    tokensV2: [tokenAv2, tokenBv2],
    swap: {
      neonTokenTransfer: NEONAddress,
      router: pancakeRouterAddress,
      factory: pancakeFactoryAddress,
      pairs: {
        [`${wSymbol}/${aSymbol}`]: pairAddressA,
        [`${aSymbol}/${wSymbol}`]: pairAddressA,
        [`${wSymbol}/${bSymbol}`]: pairAddressB,
        [`${bSymbol}/${wSymbol}`]: pairAddressB,
        [`${aSymbol}/${bSymbol}`]: pairAddressAB,
        [`${bSymbol}/${aSymbol}`]: pairAddressAB,
        [`${a2Symbol}/${b2Symbol}`]: pairAddressABv2,
        [`${b2Symbol}/${a2Symbol}`]: pairAddressABv2
      }
    },
    airdrop: [
      tokenA.address_spl,
      tokenB.address_spl,
      tokenAv2.address_spl,
      tokenBv2.address_spl
    ]
  };

  const json = JSON.stringify(result, null, 2);
  console.log(json);
  writeToFile('addresses.json', json);
  writeToFile('addresses.ts', `export const addresses = ${json}`);
  writeToFile('addresses.js', `const addresses = ${json};\n\nmodule.exports = {addresses};`);

  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
