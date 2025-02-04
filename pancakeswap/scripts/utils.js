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

async function getSolanaTransactions(neonTxHash) {
    return await fetch(process.env.NEON_EVM_NODE, {
        method: 'POST',
        body: JSON.stringify({
            "jsonrpc":"2.0",
            "method":"neon_getSolanaTransactionByNeonTransaction",
            "params":[neonTxHash],
            "id":1
        }),
        headers: { 'Content-Type': 'application/json' }
    });
}
function prepareInstructionAccounts(instruction, overwriteAccounts) {
    let encodeKeys = '';
    for (let i = 0, len = instruction.keys.length; i < len; ++i) {
        if (typeof(overwriteAccounts) != "undefined" && Object.hasOwn(overwriteAccounts, i)) {
            // console.log(publicKeyToBytes32(overwriteAccounts[i].key), 'publicKey');
            encodeKeys+= ethers.solidityPacked(["bytes32"], [publicKeyToBytes32(overwriteAccounts[i].key)]).substring(2);
            encodeKeys+= ethers.solidityPacked(["bool"], [overwriteAccounts[i].isSigner]).substring(2);
            encodeKeys+= ethers.solidityPacked(["bool"], [overwriteAccounts[i].isWritable]).substring(2);
        } else {
            // console.log(publicKeyToBytes32(instruction.keys[i].pubkey.toString()), 'publicKey');
            encodeKeys+= ethers.solidityPacked(["bytes32"], [publicKeyToBytes32(instruction.keys[i].pubkey.toString())]).substring(2);
            encodeKeys+= ethers.solidityPacked(["bool"], [instruction.keys[i].isSigner]).substring(2);
            encodeKeys+= ethers.solidityPacked(["bool"], [instruction.keys[i].isWritable]).substring(2);
        }
    }
    return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.keys.length), 8).substring(2) + encodeKeys;
}

function prepareInstructionData(instruction) {
    const packedInstructionData = ethers.solidityPacked(
        ["bytes"],
        [instruction.data]
    ).substring(2);
    // console.log(packedInstructionData, 'packedInstructionData');
    return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.data.length), 8).substring(2) + packedInstructionData;
}

function prepareInstruction(instruction) {
    return publicKeyToBytes32(instruction.programId.toBase58()) + prepareInstructionAccounts(instruction).substring(2) + prepareInstructionData(instruction).substring(2);
}

function publicKeyToBytes32(pubkey) {
    return ethers.zeroPadValue(ethers.toBeHex(ethers.decodeBase58(pubkey)), 32);
}

module.exports = {
    asyncTimeout,
    airdropNEON,
    getSolanaTransactions,
    prepareInstruction
};