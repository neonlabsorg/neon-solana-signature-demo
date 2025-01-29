const { ethers } = require("hardhat")
require("dotenv").config()

async function run() {
    console.log(process.env.NEON_EVM_NODE, 'NeonEVM node')
    console.log(process.env.NEON_FAUCET, 'Neon faucet')

    const [deployer, user1, user2, user3] = await ethers.getSigners()

    console.log(deployer.address, 'deployer')
    console.log(user1.address, 'user1')
    console.log(user2.address, 'user2')
    console.log(user3.address, 'user3')
}

run().then(() => console.log("Done"))

