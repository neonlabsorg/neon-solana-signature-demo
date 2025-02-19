const { ethers, network, run } = require('hardhat');
const { default: bs58 } = require('bs58');
const config = require('../config');
const { airdropNEON, writeToFile } = require('./utils');
const { createPairAndAddLiquidity } = require('./create-liquidity-pools');
const { addresses } = require('../artifacts/addresses');

async function main() {
  await run('compile');

  console.log(`\nNetwork name: ${network.name}`);

  if (!process.env.DEPLOYER_KEY) {
    throw new Error('\nMissing private key: DEPLOYER_KEY');
  }

  const deployer = (await ethers.getSigners())[0];
  console.log(`\nDeployer address: ${deployer.address}`);

  let deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address));
  const minBalance = ethers.parseUnits('10000', 18); // 10000 NEON
  if (
    deployerBalance < minBalance &&
    parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)) > 0
  ) {
    await airdropNEON(deployer.address, parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)));
    deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address));
  }
  console.log(`\nDeployer balance: ${ethers.formatUnits(deployerBalance.toString(), 18)} NEON`);

  const mintAuthority = deployer.address; // Set deployer as mint authority
  const contract = 'contracts/erc20-for-spl-v2/token/ERC20ForSpl/erc20_for_spl.sol:ERC20ForSplMintable';

  const tokenA = await deployERC20ForSPLV2Mintable(
    'token_Av2',
    'Token A (v2)',
    'TOKEN_Av2',
    9, // new version have limit of maximum 9 decimals, because Solana don't support more
    mintAuthority,
    contract
  );

  const tokenB = await deployERC20ForSPLV2Mintable(
    'token_Bv2',
    'Token B (v2)',
    'TOKEN_Bv2',
    9, // new version have limit of maximum 9 decimals, because Solana don't support more
    mintAuthority,
    contract
  );

  const pancakeFactoryAddress = addresses.swap.factory;
  const pancakeRouterAddress = addresses.swap.router;

  // Create TOKEN_A-TOKEN_B pair and provide liquidity
  const pairAddressAB = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    tokenA.address,
    tokenB.address,
    30000,
    65000,
    contract
  );

  const aSymbol = tokenA.symbol.toLowerCase();
  const bSymbol = tokenB.symbol.toLowerCase();

  const result = { ...addresses };
  result.tokensV2 = [tokenA, tokenB];
  result.swap.pairs = {
    ...result.swap.pairs,
    [`${aSymbol}/${bSymbol}`]: pairAddressAB,
    [`${bSymbol}/${aSymbol}`]: pairAddressAB
  }

  const json = JSON.stringify(result, null, 2);
  console.log(json);
  writeToFile('addresses.ts', `export const addresses = ${json}`);
  writeToFile('addresses.js', `const addresses = ${json};\n\nmodule.exports = {addresses};`);

  console.log('\n');
}

async function deployERC20ForSPLV2Mintable(
  tokenKey,
  name,
  symbol,
  decimals,
  mintAuthority,
  contract
) {
  const ERC20ForSPLMintableContractFactory = await ethers.getContractFactory(contract);
  let token;
  if (!config[tokenKey][network.name]) {
    console.log(`\nDeploying ERC20ForSPLMintable contract to ${network.name}...`);
    token = await ERC20ForSPLMintableContractFactory.deploy(
      name,
      symbol,
      decimals,
      mintAuthority
    );
    await token.waitForDeployment();
    console.log(`ERC20ForSPLMintable contract deployed to: ${token.target}`);
  } else {
    console.log(`\nERC20ForSPLMintable contract already deployed to: ${config[tokenKey][network.name]}`);
    token = ERC20ForSPLMintableContractFactory.attach(config[tokenKey][network.name]);
  }

  const tokenAddress = token.target;
  const tokenName = await token.name();
  const tokenSymbol = await token.symbol();
  const tokenDecimals = await token.decimals();
  const tokenMint = await token.tokenMint();
  const address_spl = bs58.encode(ethers.getBytes(tokenMint));

  console.log(`\nToken address: ${tokenAddress}`);
  console.log(`Token spl address: ${address_spl}`);
  console.log(`Token name: ${tokenName}`);
  console.log(`Token symbol: ${tokenSymbol}`);
  console.log(`Token decimals: ${tokenDecimals}`);
  console.log(`Token mint authority: ${mintAuthority}`);

  return {
    address: tokenAddress,
    address_spl: address_spl,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: Number(tokenDecimals)
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = {
  deployERC20ForSPLV2Mintable
};
