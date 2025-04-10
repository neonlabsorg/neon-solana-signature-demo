const { ethers, network, run } = require('hardhat');
const config = require('../config');
const { asyncTimeout, deployerAirdrop } = require('./utils');

async function main() {
  await run('compile');

  console.log('\nNetwork name: ' + network.name);

  if (!process.env.DEPLOYER_KEY) {
    throw new Error('\nMissing private key: DEPLOYER_KEY');
  }

  const deployer = (await ethers.getSigners())[0];
  await deployerAirdrop(deployer, 10000);

  if (config.pancakeFactory[network.name] && config.pancakeRouter[network.name]) {
    console.log('\nPancakeFactory contract address:' + config.pancakeFactory[network.name]);
    console.log('\nPancakeRouter contract address:' + config.pancakeRouter[network.name]);

    let tokenAKey = 'WNEON';
    let tokenBKey = 'token_A';
    if (config[tokenAKey][network.name] && config[tokenBKey][network.name]) {
      await createPairAndAddLiquidity(
        config.pancakeFactory[network.name],
        config.pancakeRouter[network.name],
        deployer,
        config[tokenAKey][network.name],
        config[tokenBKey][network.name],
        1000,
        10000
      );
    } else {
      console.log('\nMissing ' + tokenAKey + ' and/or ' + tokenBKey + ' address(es) in config file');
    }
    tokenAKey = 'token_A';
    tokenBKey = 'token_B';
    if (config[tokenAKey][network.name] && config[tokenBKey][network.name]) {
      await createPairAndAddLiquidity(
        config.pancakeFactory[network.name],
        config.pancakeRouter[network.name],
        deployer,
        config[tokenAKey][network.name],
        config[tokenBKey][network.name],
        5000,
        20000
      );
    } else {
      console.log('\nMissing ' + tokenAKey + ' and/or ' + tokenBKey + ' address(es) in config file');
    }
  } else {
    console.log('\nMissing PancakeFactory and/or PancakeRouter address(es) in config file');
  }
  console.log('\n');
}

async function createPairAndAddLiquidity(
  pancakeFactoryAddress,
  pancakeRouterAddress,
  deployer,
  tokenAAddress,
  tokenBAddress,
  amountA,
  amountB,
  contract = `ERC20ForSplMintable`
) {
  const pancakeRouterContractFactory = await ethers.getContractFactory('PancakeRouter');
  const pancakeRouter = pancakeRouterContractFactory.attach(pancakeRouterAddress);
  const WNEONAddress = await pancakeRouter.WETH();
  const TokenAContractFactory = tokenAAddress === WNEONAddress
    ? await ethers.getContractFactory('WNEON')
    : await ethers.getContractFactory(contract);
  const TokenBContractFactory = tokenBAddress === WNEONAddress
    ? await ethers.getContractFactory('WNEON')
    : await ethers.getContractFactory(contract);

  const tokenA = TokenAContractFactory.attach(tokenAAddress);
  const tokenB = TokenBContractFactory.attach(tokenBAddress);
  const tokenASymbol = await tokenA.symbol();
  const tokenBSymbol = await tokenB.symbol();
  const tokenADecimals = await tokenA.decimals();
  const tokenBDecimals = await tokenB.decimals();
  const tokenAAmount = ethers.parseUnits(amountA.toString(), tokenADecimals);
  const tokenBAmount = ethers.parseUnits(amountB.toString(), tokenBDecimals);

  const pairAddress = await createPair(
    pancakeFactoryAddress,
    tokenAAddress,
    tokenBAddress,
    tokenASymbol,
    tokenBSymbol
  );

  // Mint token A to deployer if needed
  let balanceA = await tokenA.balanceOf(deployer.address);
  if (balanceA < tokenAAmount) {
    let amountToMint = BigInt(tokenAAmount) - BigInt(balanceA);
    if (tokenAAddress === WNEONAddress) {
      await tokenA.deposit({ value: amountToMint });
    } else {
      await tokenA.mint(deployer.address, amountToMint);
    }
    await asyncTimeout(3000);
    console.log(`Minted ${ethers.formatUnits(amountToMint.toString(), tokenADecimals)} ${tokenASymbol} to deployer address ${deployer.address}`);
    balanceA = await tokenA.balanceOf(deployer.address);
  }
  console.log(`Deployer ${tokenASymbol} balance: ${ethers.formatUnits(balanceA.toString(), tokenADecimals)}`);

  // Approve router to spend token A on behalf of deployer if needed
  let allowanceA = await tokenA.allowance(deployer.address, pancakeRouterAddress);
  if (allowanceA < tokenAAmount) {
    await tokenA.approve(pancakeRouterAddress, tokenAAmount);
    await asyncTimeout(3000);
    allowanceA = await tokenA.allowance(deployer.address, pancakeRouterAddress);
    console.log(`Approved PancakeRouter to spend ${ethers.formatUnits(allowanceA.toString(), tokenADecimals)} ${tokenASymbol} on behalf of deployer`);
  }
  console.log(`PancakeRouter ${tokenASymbol} allowance: ${ethers.formatUnits(allowanceA.toString(), tokenADecimals)}`);

  // Mint token B to deployer if needed
  let balanceB = await tokenB.balanceOf(deployer.address);
  if (balanceB < tokenBAmount) {
    let amountToMint = BigInt(tokenBAmount) - BigInt(balanceB);
    if (tokenBAddress === WNEONAddress) {
      await tokenB.deposit({ value: amountToMint });
    } else {
      await tokenB.mint(deployer.address, amountToMint);
    }
    await asyncTimeout(3000);
    console.log(`Minted ${ethers.formatUnits(amountToMint.toString(), tokenBDecimals)} ${tokenBSymbol} to deployer address ${deployer.address}`);
    balanceB = await tokenB.balanceOf(deployer.address);
  }
  console.log(`Deployer ${tokenBSymbol} balance: ${ethers.formatUnits(balanceB.toString(), tokenBDecimals)}`);

  // Approve router to spend token B on behalf of deployer if needed
  let allowanceB = await tokenB.allowance(deployer.address, pancakeRouterAddress);
  if (allowanceB < tokenBAmount) {
    await tokenB.approve(pancakeRouterAddress, tokenBAmount);
    await asyncTimeout(3000);
    allowanceB = await tokenB.allowance(deployer.address, pancakeRouterAddress);
    console.log(`Approved PancakeRouter to spend ${ethers.formatUnits(allowanceB.toString(), tokenBDecimals)} ${tokenBSymbol} on behalf of deployer`);
  }
  console.log(`PancakeRouter ${tokenBSymbol} allowance: ${ethers.formatUnits(allowanceB.toString(), tokenBDecimals)}`);

  await addLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    tokenAAddress,
    tokenBAddress,
    tokenASymbol,
    tokenBSymbol,
    tokenAAmount,
    tokenBAmount,
    deployer.address
  );

  const a = amountA > amountB ? tokenAAddress : tokenBAddress;
  const b = amountB > amountA ? tokenAAddress : tokenBAddress;

  return { pair: pairAddress, a, b };
}

async function createPair(
  pancakeFactoryAddress,
  tokenAAddress,
  tokenBAddress,
  tokenASymbol,
  tokenBSymbol
) {
  const pancakeFactoryContractFactory = await ethers.getContractFactory('PancakeFactory');
  const pancakeFactory = pancakeFactoryContractFactory.attach(pancakeFactoryAddress);
  let pairAddress = await pancakeFactory.getPair(tokenAAddress, tokenBAddress);
  if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
    await pancakeFactory.createPair(tokenAAddress, tokenBAddress);
    await asyncTimeout(3000);
    pairAddress = await pancakeFactory.getPair(tokenAAddress, tokenBAddress);
    console.log(`Deployed new ${tokenASymbol}/${tokenBSymbol} pair at address: ${pairAddress}`);
  } else {
    console.log(`${tokenASymbol}/${tokenBSymbol} pair already exists at address: ${pairAddress}`);
  }

  return pairAddress;
}

async function addLiquidity(
  pancakeFactoryAddress,
  pancakeRouterAddress,
  tokenAAddress,
  tokenBAddress,
  tokenASymbol,
  tokenBSymbol,
  tokenAAmount,
  tokenBAmount,
  toAddress
) {
  const pancakeRouterContractFactory = await ethers.getContractFactory('PancakeRouter');
  const pancakeRouter = pancakeRouterContractFactory.attach(pancakeRouterAddress);

  await pancakeRouter.addLiquidity(
    tokenAAddress,
    tokenBAddress,
    tokenAAmount,
    tokenBAmount,
    tokenAAmount,
    tokenBAmount,
    toAddress,
    Date.now() + 1000000000
  );
  await asyncTimeout(3000);
  console.log(`Added liquidity to ${tokenASymbol}/${tokenBSymbol} PancakePair`);

  const pancakeFactoryContractFactory = await ethers.getContractFactory('PancakeFactory');
  const pancakeFactory = pancakeFactoryContractFactory.attach(pancakeFactoryAddress);
  const pairAddress = await pancakeFactory.getPair(tokenAAddress, tokenBAddress);

  const pancakePairContractFactory = await ethers.getContractFactory('PancakePair');
  const pancakePair = pancakePairContractFactory.attach(pairAddress);
  const pairReserves = await pancakePair.getReserves();
  console.log(`--> Pair reserves: [${pairReserves[0]}, ${pairReserves[1]}]`);

  const pancakeERC20ContractFactory = await ethers.getContractFactory('PancakeERC20');
  const pancakePairERC20 = pancakeERC20ContractFactory.attach(pairAddress);
  const pairDecimals = await pancakePairERC20.decimals();
  const LPBalance = await pancakePairERC20.balanceOf(toAddress);
  console.log(`--> LP address: ${toAddress}`);
  console.log(`--> LP balance: ${ethers.formatUnits(LPBalance.toString(), pairDecimals)}`);
}

/*
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
*/

module.exports = {
  createPairAndAddLiquidity,
  createPair,
  addLiquidity
};
