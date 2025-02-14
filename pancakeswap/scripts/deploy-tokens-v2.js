const { ethers, network, run } = require('hardhat');
const { default: bs58 } = require('bs58');
const config = require('../config');
const { airdropNEON } = require('./utils');

async function main() {
  await run('compile');

  console.log('\nNetwork name: ' + network.name);

  if (!process.env.DEPLOYER_KEY) {
    throw new Error('\nMissing private key: DEPLOYER_KEY');
  }

  const deployer = (await ethers.getSigners())[0];
  console.log('\nDeployer address: ' + deployer.address);

  let deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address));
  const minBalance = ethers.parseUnits('10000', 18); // 10000 NEON
  if (
    deployerBalance < minBalance &&
    parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)) > 0
  ) {
    await airdropNEON(deployer.address, parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)));
    deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address));
  }
  console.log('\nDeployer balance: ' + ethers.formatUnits(deployerBalance.toString(), 18) + ' NEON');

  const mintAuthority = deployer.address; // Set deployer as mint authority

  await deployERC20ForSPLMintable(
    'token_A',
    'Token A',
    'TOKEN_A',
    9, // new version have limit of maximum 9 decimals, because Solana don't support more
    mintAuthority
  );

    await deployERC20ForSPLMintable(
        'token_B',
        'Token B',
        'TOKEN_B',
        9, // new version have limit of maximum 9 decimals, because Solana don't support more
        mintAuthority
      );

  console.log('\n');
}

async function deployERC20ForSPLMintable(
  tokenKey,
  name,
  symbol,
  decimals,
  mintAuthority
) {
  const ERC20ForSPLMintableContractFactory = await ethers.getContractFactory('contracts/erc20-for-spl-v2/token/ERC20ForSpl/erc20_for_spl.sol:ERC20ForSplMintable');
  let token;
  if (!config[tokenKey][network.name]) {
    console.log('\nDeploying ERC20ForSPLMintable contract to ' + network.name + '...');
    token = await ERC20ForSPLMintableContractFactory.deploy(
      name,
      symbol,
      decimals,
      mintAuthority
    );
    await token.waitForDeployment();
    console.log('ERC20ForSPLMintable contract deployed to: ' + token.target);
  } else {
    console.log('\nERC20ForSPLMintable contract already deployed to: ' + config[tokenKey][network.name]);
    token = ERC20ForSPLMintableContractFactory.attach(config[tokenKey][network.name]);
  }

  const tokenAddress = token.target;
  const tokenName = await token.name();
  const tokenSymbol = await token.symbol();
  const tokenDecimals = await token.decimals();
  const tokenMint = await token.tokenMint();
  const address_spl = bs58.encode(ethers.getBytes(tokenMint));

  console.log('\nToken address: ' + tokenAddress);
  console.log('Token spl address: ' + address_spl);
  console.log('Token name: ' + tokenName);
  console.log('Token symbol: ' + tokenSymbol);
  console.log('Token decimals: ' + tokenDecimals);
  console.log('Token mint authority: ' + mintAuthority);

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
        console.error(error)
        process.exit(1)
    })


module.exports = {
  deployERC20ForSPLMintable
};