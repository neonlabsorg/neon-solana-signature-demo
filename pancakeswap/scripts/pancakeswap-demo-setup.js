const { ethers, network, run} = require("hardhat")
const { deployPancakeswapExchange } = require("./deploy-pancakeswap-exchange")
const { deployERC20ForSPLMintable } = require("./deploy-tokens")
const { createPairAndAddLiquidity } = require("./create-liquidity-pools")
const {airdropNEON} = require("./utils");
require("dotenv").config()

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

    // Deploy Pancakeswap exchnage contracts and WNEON
    const pancakeExchangeAddresses = await deployPancakeswapExchange(deployer)

    const mintAuthority = deployer.address // Set deployer as mint authority

    // Deploy TOKEN_A (ERC20ForSPLMintable)
    const tokenAAddress = await deployERC20ForSPLMintable(
        "token_A",
        "Token A",
        "TOKEN_A",
        9,
        mintAuthority
    )

    // Deploy TOKEN_B (ERC20ForSPLMintable)
    const tokenBAddress = await deployERC20ForSPLMintable(
        "token_B",
        "Token B",
        "TOKEN_B",
        12,
        mintAuthority
    )

    // Create WNEON-TOKEN_A pair and provide liquidity
    await createPairAndAddLiquidity(
        pancakeExchangeAddresses.pancakeFactoryAddress,
        pancakeExchangeAddresses.pancakeRouterAddress,
        deployer,
        pancakeExchangeAddresses.WNEONAddress,
        tokenAAddress,
        12000,
        7333
    )

    // Create TOKEN_A-TOKEN_B pair and provide liquidity
    await createPairAndAddLiquidity(
        pancakeExchangeAddresses.pancakeFactoryAddress,
        pancakeExchangeAddresses.pancakeRouterAddress,
        deployer,
        tokenAAddress,
        tokenBAddress,
        6345,
        53809
    )

    console.log("\n")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
