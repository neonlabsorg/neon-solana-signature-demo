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

    let WNEONAddress;
    if (!config.WNEON[networkName]) {
        console.log("\nDeploying WNEON contract to " + networkName + "...");
        const WNEONContractFactory = await ethers.getContractFactory("WNEON");
        const WNEON = await WNEONContractFactory.deploy();
        await WNEON.waitForDeployment();
        console.log("WNEON contract deployed to:", WNEON.target);
        WNEONAddress = WNEON.target;
    } else {
        console.log("\nWNEON contract already deployed to:", config.WNEON[networkName]);
        WNEONAddress = config.WNEON[networkName];
    }

    let pancakeFactoryAddress;
    if (!config.pancakeFactory[networkName]) {
        console.log("\nDeploying PancakeFactory contract to " + networkName + "...");
        const pancakeFactoryContractFactory = await ethers.getContractFactory("PancakeFactory");
        const pancakeFactory = await pancakeFactoryContractFactory.deploy(deployer.address);
        await pancakeFactory.waitForDeployment();
        console.log("PancakeFactory contract deployed to:", pancakeFactory.target);
        pancakeFactoryAddress = pancakeFactory.target;
    } else {
        console.log("\nPancakeFactory contract already deployed to:", config.pancakeFactory[networkName]);
        pancakeFactoryAddress = config.pancakeFactory[networkName];
    }

    if (!config.pancakeRouter[networkName]) {
        console.log("\nDeploying PancakeRouter contract to " + networkName + "...");
        const pancakeRouterContractFactory = await ethers.getContractFactory("PancakeRouter");
        const pancakeRouter = await pancakeRouterContractFactory.deploy(
            pancakeFactoryAddress,
            WNEONAddress
        );
        await pancakeRouter.waitForDeployment();
        console.log("PancakeRouter contract deployed to:", pancakeRouter.target);
    } else {
        console.log("\nPancakeRouter contract already deployed to:", config.pancakeRouter[networkName]);
    }
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
