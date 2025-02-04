const { ethers, network, run } = require("hardhat")
const web3 = require("@solana/web3.js");
const {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createInitializeMint2Instruction
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

    // ============================= PREPARE SWAP DATA ====================================

    const pancakeRouterContractFactory = await ethers.getContractFactory("PancakeRouter")
    const pancakeRouter = pancakeRouterContractFactory.attach(config.pancakeRouter[network.name])

    // Swap NEON for TOKEN_A (1 hop)
    const path = [config.WNEON[network.name], config.token_A[network.name]]
    const amountIn = BigInt('1000000000000000000') // 1 NEON
    const swapsCount = 3

    // ============================= FORMAT SOLANA INSTRUCTIONS ====================================

    const solanaConnection = new web3.Connection(process.env.SOLANA_NODE, "processed");
    // const callSolana = await ethers.getContractAt('ICallSolana', '0xFF00000000000000000000000000000000000006');
    const payer = ethers.encodeBase58(await iterativeComposability.getPayer());
    // console.log(payer, 'payer');
    const contractPublicKeyInBytes = await iterativeComposability.getNeonAddress(iterativeComposability.target);
    const contractPublicKey = ethers.encodeBase58(contractPublicKeyInBytes);
    // console.log(contractPublicKey, 'contractPublicKey');
    const deployerPublicKeyInBytes = await iterativeComposability.getNeonAddress(deployer.address);
    const deployerPublicKey = ethers.encodeBase58(deployerPublicKeyInBytes);
    // console.log(deployerPublicKey, 'deployerPublicKey');
    const seed = 'seed' + Date.now().toString(); // random seed on each script call
    const createWithSeed = await web3.PublicKey.createWithSeed(new web3.PublicKey(contractPublicKey), seed, new web3.PublicKey(TOKEN_PROGRAM_ID));
    // console.log(createWithSeed, 'createWithSeed');
    const createAccountWithSeedMinLamports = await solanaConnection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // ============================= createAccountWithSeed INSTRUCTION ====================================
    const createAccountWithSeedIx = web3.SystemProgram.createAccountWithSeed({
        fromPubkey: new web3.PublicKey(payer),
        basePubkey: new web3.PublicKey(contractPublicKey),
        newAccountPubkey: createWithSeed,
        seed: seed,
        lamports: createAccountWithSeedMinLamports, // enough lamports to make the account rent exempt
        space: MINT_SIZE,
        programId: new web3.PublicKey(TOKEN_PROGRAM_ID) // programId
    })
    // console.log(createAccountWithSeedIx, 'createAccountWithSeedIx')
    // console.log('\n')

    const createAccountWithSeedIxAccounts = [(new web3.PublicKey(payer)).toBuffer(), createWithSeed.toBuffer(), (new web3.PublicKey(contractPublicKey)).toBuffer()]
    const createAccountWithSeedIxIsSigner = [true, false, true]
    const createAccountWithSeedIxIsWritable = [true, true, false]
    const createAccountWithSeedIxData = createAccountWithSeedIx.data

    // ============================= InitializeMint2 INSTRUCTION ====================================
    const initializeMint2Ix = createInitializeMint2Instruction(
        createWithSeed,
        9, // decimals
        new web3.PublicKey(contractPublicKey), // mintAuthority
        new web3.PublicKey(contractPublicKey), // freezeAuthority
        new web3.PublicKey(TOKEN_PROGRAM_ID) // programId
    )
    // console.log(initializeMint2Ix, 'initializeMint2Ix')
    // console.log('\n')

    const initializeMint2IxAccount = createWithSeed.toBuffer()
    const initializeMint2IxData = initializeMint2Ix.data

    console.log('\nCalling iterativeComposability.testIterativeComposabilityWithIxFormatting: ')

    let tx = await iterativeComposability.testIterativeComposabilityWithIxFormatting(
        swapsCount,
        pancakeRouter.target,
        path,
        createAccountWithSeedIxAccounts,
        createAccountWithSeedIxIsSigner,
        createAccountWithSeedIxIsWritable,
        createAccountWithSeedIxData,
        createAccountWithSeedMinLamports,
        initializeMint2IxAccount,
        initializeMint2IxData,
        { value: amountIn * BigInt(swapsCount) }
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


    console.log('\nCalling iterativeComposability.testIterativeComposability: ')
    tx = await iterativeComposability.testIterativeComposability(
        swapsCount,
        pancakeRouter.target,
        path,
        prepareInstruction(createAccountWithSeedIx),
        createAccountWithSeedMinLamports,
        prepareInstruction(initializeMint2Ix),
        0,
        { value: amountIn * BigInt(swapsCount) }
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

    return iterativeComposability
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })