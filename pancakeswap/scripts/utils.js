const {ethers} = require("hardhat");

async function asyncTimeout(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
    })
}

async function airdropNEON(address, amount) {
    const postRequestNeons = await fetch(process.env.NEON_FAUCET, {
        method: 'POST',
        body: JSON.stringify({"amount": amount, "wallet": address}),
        headers: { 'Content-Type': 'application/json' }
    });
    console.log("\nAirdropping " + ethers.formatUnits(amount.toString(), 0) + " NEON to " + address);
    await asyncTimeout(3000);
}

module.exports = {
    asyncTimeout,
    airdropNEON
};