const { ethers, network, run } = require("hardhat");
const config = require("../config");

async function main() {
    await run("compile");

    const networkName = network.name;
    console.log("\nNetwork name: " + networkName);

    if (!process.env.DEPLOYER_KEY) {
        throw new Error("\nMissing private key: DEPLOYER_KEY");
    }

    const deployer = (await ethers.getSigners())[0];
    console.log("\nDeployer address: " + deployer.address);

    const ERC20ForSPLMintableContractFactory = await ethers.getContractFactory("ERC20ForSplMintable");
    const mintAuthority = deployer.address; // Set deployer as mint authority

    await deployERC20ForSPLMintable(
        "token_A",
        networkName,
        ERC20ForSPLMintableContractFactory,
        "Token A",
        "TOKEN_A",
        9,
        mintAuthority
    );

    await deployERC20ForSPLMintable(
        "token_B",
        networkName,
        ERC20ForSPLMintableContractFactory,
        "Token B",
        "TOKEN_B",
        12,
        mintAuthority
    );

    console.log("\n");
}

async function deployERC20ForSPLMintable(
    tokenKey,
    networkName,
    ERC20ForSPLMintableContractFactory,
    name,
    symbol,
    decimals,
    mintAuthority
) {
    let token;
    if (!config[tokenKey][networkName]) {
        console.log("\nDeploying ERC20ForSPLMintable contract to " + networkName + "...");
        token = await ERC20ForSPLMintableContractFactory.deploy(
            name,
            symbol,
            decimals,
            mintAuthority
        );
        await token.waitForDeployment();
        console.log("ERC20ForSPLMintable contract deployed to:", token.target);
    } else {
        console.log("\nERC20ForSPLMintable contract already deployed to:", config[tokenKey][networkName]);
        token = ERC20ForSPLMintableContractFactory.attach(config[tokenKey][networkName]);
    }

    let tokenAddress = token.target;
    let tokenName = await token.name()
    let tokenSymbol = await token.symbol()
    let tokenDecimals = (await token.decimals()).toString()
    console.log("\nToken address:", tokenAddress);
    console.log("Token name:", tokenName);
    console.log("Token symbol:", tokenSymbol);
    console.log("Token decimals:", tokenDecimals);
    console.log("Token mint authority:", mintAuthority);

    return tokenAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
