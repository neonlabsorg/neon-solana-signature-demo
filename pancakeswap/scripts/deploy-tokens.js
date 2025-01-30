const { ethers, network, run } = require("hardhat")
const config = require("../config")
const {airdropNEON} = require("./utils")

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

    const mintAuthority = deployer.address // Set deployer as mint authority

    await deployERC20ForSPLMintable(
        "token_A",
        "Token A",
        "TOKEN_A",
        9,
        mintAuthority
    )

    await deployERC20ForSPLMintable(
        "token_B",
        "Token B",
        "TOKEN_B",
        12,
        mintAuthority
    )

    console.log("\n")
}

async function deployERC20ForSPLMintable(
    tokenKey,
    name,
    symbol,
    decimals,
    mintAuthority
) {
    const ERC20ForSPLMintableContractFactory = await ethers.getContractFactory("ERC20ForSplMintable")

    let token
    if (!config[tokenKey][network.name]) {
        console.log("\nDeploying ERC20ForSPLMintable contract to " + network.name + "...")
        token = await ERC20ForSPLMintableContractFactory.deploy(
            name,
            symbol,
            decimals,
            mintAuthority
        )
        await token.waitForDeployment()
        console.log("ERC20ForSPLMintable contract deployed to: " + token.target)
    } else {
        console.log("\nERC20ForSPLMintable contract already deployed to: " + config[tokenKey][network.name])
        token = ERC20ForSPLMintableContractFactory.attach(config[tokenKey][network.name])
    }

    let tokenAddress = token.target
    let tokenName = await token.name()
    let tokenSymbol = await token.symbol()
    let tokenDecimals = (await token.decimals()).toString()
    console.log("\nToken address: " + tokenAddress)
    console.log("Token name: " + tokenName)
    console.log("Token symbol: " + tokenSymbol)
    console.log("Token decimals: " + tokenDecimals)
    console.log("Token mint authority: " + mintAuthority)

    return tokenAddress
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
    deployERC20ForSPLMintable
}