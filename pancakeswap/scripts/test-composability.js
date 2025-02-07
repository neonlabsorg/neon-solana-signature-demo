const { ethers, network, run } = require("hardhat")
const web3 = require("@solana/web3.js");
const {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createInitializeMint2Instruction,
    createMintToInstruction,
    getAssociatedTokenAddress
} = require('@solana/spl-token');
const config = require("../config")
const { asyncTimeout, airdropNEON, getSolanaTransactions, prepareInstruction } = require("./utils");

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

    const iterativeComposability = await deployIterativeComposabilityContract()

    // =================================== Create and initialize new SPL token mint ====================================

    const seed = 'seed' + Date.now().toString();
    const decimals = 9

    const contractPublicKeyInBytes = await iterativeComposability.getNeonAddress(iterativeComposability.target);

    console.log('\nCalling iterativeComposability.testCreateInitializeTokenMint: ')

    let tx = await iterativeComposability.testCreateInitializeTokenMint(
        Buffer.from(seed),  // Seed to generate new SPL token mint account on-chain (identical to createAccountWithSeed)
        decimals, // Decimals value for the new SPL token to be created on Solana
    )

    console.log('\nNeonEVM transaction hash: ' + tx.hash)
    await tx.wait(1) // Wait for 1 confirmation
    let txReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    console.log(txReceipt.status, 'txReceipt.status')

    let solanaTransactions = (await (await getSolanaTransactions(tx.hash)).json()).result

    console.log('\nSolana transactions signatures:')
    for await (let txId of solanaTransactions) {
      console.log(txId)
    }

    console.log("\n")

    // =================================== Mint SPL token amount to recipient ====================================
    const tokenMint = await iterativeComposability.tokenMint();
    const solanaRecipient = web3.Keypair.generate()

    let solanaRecipientATA = await getAssociatedTokenAddress(
        new web3.PublicKey(ethers.encodeBase58(tokenMint)),
        solanaRecipient.publicKey,
        true
    );

    console.log(ethers.encodeBase58(tokenMint), 'tokenMint')
    console.log(solanaRecipient.publicKey.toString(), 'solanaRecipient.publicKey')
    console.log(solanaRecipientATA.toString(), 'solanaRecipientATA')

    let ix = createMintToInstruction(
        new web3.PublicKey(ethers.encodeBase58(tokenMint)),
        solanaRecipientATA,
        new web3.PublicKey(ethers.encodeBase58(contractPublicKeyInBytes)),
        1000 * 10 ** 9 // mint 1000 tokens
    )

    console.log(ix)

    console.log('\nCalling iterativeComposability.testMintTokens: ')

    tx = await iterativeComposability.testMintTokens(
        tokenMint,
        solanaRecipientATA.toBuffer(), // Solana recipient ATA
        1000 * 10 ** 9 // amount (mint 1000 tokens)
    )

    console.log('\nNeonEVM transaction hash: ' + tx.hash)
    await tx.wait(1) // Wait for 1 confirmation
    txReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    console.log(txReceipt.status, 'txReceipt.status')

    solanaTransactions = (await (await getSolanaTransactions(tx.hash)).json()).result

    console.log('\nSolana transactions signatures:')
    for await (let txId of solanaTransactions) {
        console.log(txId)
    }

    console.log("\n")

}

async function deployIterativeComposabilityContract() {
    const IterativeComposabilityContractFactory = await ethers.getContractFactory("IterativeComposability")

    let iterativeComposability
    if (!config.iterativeComposability[network.name]) {
        console.log("\nDeploying IterativeComposability contract to " + network.name + "...")
        iterativeComposability = await IterativeComposabilityContractFactory.deploy()
        await iterativeComposability.waitForDeployment()
        console.log("IterativeComposability contract deployed to: " + iterativeComposability.target)
    } else {
        console.log("\nIterativeComposability contract already deployed to: " + config.iterativeComposability[network.name])
        iterativeComposability = IterativeComposabilityContractFactory.attach(config.iterativeComposability[network.name])
    }
    console.log("\n")
    return iterativeComposability
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })