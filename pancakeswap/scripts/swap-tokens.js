const { ethers, network, run } = require("hardhat")
const web3 = require("@solana/web3.js");
const config = require("../config")
const { asyncTimeout, airdropNEON, getSolanaTransactions } = require("./utils");

async function main() {
    await run("compile")

    console.log("\nNetwork name: " + network.name)

    if (!process.env.DEPLOYER_KEY) {
        throw new Error("\nMissing private key: DEPLOYER_KEY")
    }

    const deployer = (await ethers.getSigners())[0]
    console.log("\nDeployer address: " + deployer.address)

    let deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address))
    const minBalance = ethers.parseUnits("10000", 18) // 10000 NEON
    if(
        deployerBalance < minBalance &&
        parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)) > 0
    ) {
        await airdropNEON(deployer.address, parseInt(ethers.formatUnits((minBalance - deployerBalance).toString(), 18)))
        deployerBalance = BigInt(await ethers.provider.getBalance(deployer.address))
    }
    console.log("\nDeployer balance: " + ethers.formatUnits(deployerBalance.toString(), 18) + " NEON")
    console.log("\n")

    if (!config.pancakeRouter[network.name]) {
        throw new Error("\nMissing PancakeRouter contract address: config.pancakeRouter[network.name]")
    }
    if (!config.WNEON[network.name]) {
        throw new Error("\nMissing WNEON contract address: config.WNEON[network.name]")
    }
    if (!config.token_A[network.name]) {
        throw new Error("\nMissing token_A contract address: config.token_A[network.name]")
    }
    if (!config.token_B[network.name]) {
        throw new Error("\nMissing token_A contract address: config.token_B[network.name]")
    }

    const pancakeRouterContractFactory = await ethers.getContractFactory("PancakeRouter")
    const pancakeRouter = pancakeRouterContractFactory.attach(config.pancakeRouter[network.name])

    // Swap NEON for TOKEN_A (1 hop)
    let path = [config.WNEON[network.name], config.token_A[network.name]]

    let amountIn = BigInt('1000000000000000000') // 1 NEON
    let amountsOut = await pancakeRouter.getAmountsOut(amountIn, path)
    let amountOut = amountsOut[amountsOut.length - 1]

    console.log('\nCalling pancakeRouter.swapExactETHForTokens: ')
    console.log('--> Path: ' + path)
    console.log('--> Amount in: ' + ethers.formatUnits(amountIn, 18) + ' NEON')
    console.log('--> Amount out: ' + ethers.formatUnits(amountOut, 9) + ' TOKEN_A')

    let tx = await pancakeRouter.swapExactETHForTokens(
        amountOut,
        path,
        deployer.address,
        Date.now() + 10000,
        { 'value': amountIn }
    )
    await asyncTimeout(3000)
    console.log('\nNeonEVM transaction hash: ' + tx.hash)

    let solanaTransactions = (await (await getSolanaTransactions(tx.hash)).json()).result
    console.log('\nSolana transactions signatures:')
    for await (let txId of solanaTransactions) {
        console.log(txId)
    }

    let txReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    console.log(txReceipt.status, 'txReceipt status')

    const ERC20ForSplMintableContractFactory = await ethers.getContractFactory("ERC20ForSplMintable")
    const tokenA = ERC20ForSplMintableContractFactory.attach(config.token_A[network.name])
    let tokenABalance = await tokenA.balanceOf(deployer.address)
    console.log("\nDeployer's TOKEN_A balance: " + ethers.formatUnits(tokenABalance, 9) + ' TOKEN_A')
    console.log("\n")

    // Swap TOKEN_A for TOKEN_B (1 hop)
    await tokenA.approve(config.pancakeRouter[network.name], tokenABalance)
    await asyncTimeout(3000)
    let tokenAAllowance = await tokenA.allowance(deployer.address, config.pancakeRouter[network.name])
    console.log("\nDeployer's TOKEN_A allowance to PancakeRouter: " + ethers.formatUnits(tokenAAllowance, 9) + ' TOKEN_A')

    path = [config.token_A[network.name], config.token_B[network.name]]
    amountIn = tokenABalance
    amountsOut = await pancakeRouter.getAmountsOut(amountIn, path)
    amountOut = amountsOut[amountsOut.length - 1]

    console.log('\nCalling pancakeRouter.swapExactTokensForTokens: ')
    console.log('--> Path: ' + path)
    console.log('--> Amount in: ' + ethers.formatUnits(amountIn, 9) + ' TOKEN_A')
    console.log('--> Amount out: ' + ethers.formatUnits(amountOut, 12) + ' TOKEN_B')

    tx = await pancakeRouter.swapExactTokensForTokens(
        amountIn,
        amountOut,
        path,
        deployer.address,
        Date.now() + 10000
    )
    await asyncTimeout(3000)
    console.log('\nNeonEVM transaction hash: ' + tx.hash)

    solanaTransactions = (await (await getSolanaTransactions(tx.hash)).json()).result
    console.log('\nSolana transactions signatures:')
    for await (let txId of solanaTransactions) {
        console.log(txId)
    }

    txReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    console.log(txReceipt.status, 'txReceipt status')

    const tokenB = ERC20ForSplMintableContractFactory.attach(config.token_B[network.name])
    tokenABalance = await tokenA.balanceOf(deployer.address)
    console.log("\nDeployer's TOKEN_A balance: " + ethers.formatUnits(tokenABalance, 9) + ' TOKEN_A')
    let tokenBBalance = await tokenB.balanceOf(deployer.address)
    console.log("\nDeployer's TOKEN_B balance: " + ethers.formatUnits(tokenBBalance, 12) + ' TOKEN_B')
    console.log("\n")

    // Swap TOKEN_B for WNEON (2-hops)
    await tokenB.approve(config.pancakeRouter[network.name], tokenBBalance)
    await asyncTimeout(3000)
    let tokenBAllowance = await tokenB.allowance(deployer.address, config.pancakeRouter[network.name])
    console.log("\nDeployer's TOKEN_B allowance to PancakeRouter: " + ethers.formatUnits(tokenBAllowance, 12) + ' TOKEN_B')

    path = [config.token_B[network.name], config.token_A[network.name], config.WNEON[network.name]]
    amountIn = tokenBBalance
    amountsOut = await pancakeRouter.getAmountsOut(amountIn, path)
    amountOut = amountsOut[amountsOut.length - 1]

    console.log('\nCalling pancakeRouter.swapExactTokensForTokens: ')
    console.log('--> Path: ' + path)
    console.log('--> Amount in: ' + ethers.formatUnits(amountIn, 12) + ' TOKEN_B')
    console.log('--> Amount out: ' + ethers.formatUnits(amountOut, 18) + ' WNEON')

    tx = await pancakeRouter.swapExactTokensForTokens(
        amountIn/2n,
        0,
        path,
        deployer.address,
        Date.now() + 10000
    )

    await asyncTimeout(3000)
    console.log('\nNeonEVM transaction hash: ' + tx.hash)

    solanaTransactions = (await (await getSolanaTransactions(tx.hash)).json()).result
    console.log('\nSolana transactions signatures:')
    for await (let txId of solanaTransactions) {
        console.log(txId)
    }

    txReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    console.log(txReceipt.status, 'txReceipt status')

    const wNEON = ERC20ForSplMintableContractFactory.attach(config.WNEON[network.name])
    tokenBBalance = await tokenB.balanceOf(deployer.address)
    console.log("\nDeployer's TOKEN_B balance: " + ethers.formatUnits(tokenBBalance, 12) + ' TOKEN_B')
    let wNEONBalance = await wNEON.balanceOf(deployer.address)
    console.log("\nDeployer's WNEON balance: " + ethers.formatUnits(wNEONBalance, 18) + ' WNEON')
    console.log("\n")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })