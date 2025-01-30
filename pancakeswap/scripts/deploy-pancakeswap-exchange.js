const { ethers, network, run } = require("hardhat")
const { airdropNEON } = require("./utils")
const config = require("../config")

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

    await deployPancakeswapExchange(deployer)
}

async function deployPancakeswapExchange(deployer) {
    let WNEONAddress
    if (!config.WNEON[network.name]) {
        console.log("\nDeploying WNEON contract to " + network.name + "...")
        const WNEONContractFactory = await ethers.getContractFactory("WNEON")
        const WNEON = await WNEONContractFactory.deploy()
        await WNEON.waitForDeployment()
        console.log("WNEON contract deployed to: " + WNEON.target)
        WNEONAddress = WNEON.target
    } else {
        console.log("\nWNEON contract already deployed to: " + config.WNEON[network.name])
        WNEONAddress = config.WNEON[network.name]
    }

    let pancakeFactoryAddress, pancakeRouterAddress
    if (!config.pancakeFactory[network.name]) {
        console.log("\nDeploying PancakeFactory contract to " + network.name + "...")
        const pancakeFactoryContractFactory = await ethers.getContractFactory("PancakeFactory")
        const pancakeFactory = await pancakeFactoryContractFactory.deploy(deployer.address)
        await pancakeFactory.waitForDeployment()
        console.log("PancakeFactory contract deployed to: " + pancakeFactory.target)
        pancakeFactoryAddress = pancakeFactory.target
    } else {
        console.log("\nPancakeFactory contract already deployed to: " + config.pancakeFactory[network.name])
        pancakeFactoryAddress = config.pancakeFactory[network.name]
    }

    if (!config.pancakeRouter[network.name]) {
        console.log("\nDeploying PancakeRouter contract to " + network.name + "...")
        const pancakeRouterContractFactory = await ethers.getContractFactory("PancakeRouter")
        const pancakeRouter = await pancakeRouterContractFactory.deploy(
            pancakeFactoryAddress,
            WNEONAddress
        )
        await pancakeRouter.waitForDeployment()
        console.log("PancakeRouter contract deployed to: " + pancakeRouter.target)
        pancakeRouterAddress = pancakeRouter.target
    } else {
        console.log("\nPancakeRouter contract already deployed to: " + config.pancakeRouter[network.name])
        pancakeRouterAddress = config.pancakeRouter[network.name]
    }

    return { pancakeFactoryAddress, pancakeRouterAddress, WNEONAddress }
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
    deployPancakeswapExchange
}
