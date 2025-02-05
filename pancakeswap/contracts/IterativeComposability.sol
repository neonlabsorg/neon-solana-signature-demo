// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { CallSolanaHelperLib } from './CallSolanaHelperLib.sol';
import { ICallSolana } from './ICallSolana.sol';
import { IPancakeRouter01 } from './pancakeswap/interfaces/IPancakeRouter01.sol';

contract IterativeComposability {

    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    bytes32 public constant SYSTEM_PROGRAM_ID = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 public constant TOKEN_PROGRAM_ID = 0x06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9;

    constructor() {}

    function getPayer() public view returns(bytes32) {
        return CALL_SOLANA.getPayer();
    }

    function getNeonAddress(address _address) public view returns(bytes32) {
        return CALL_SOLANA.getNeonAddress(_address);
    }

    function getSolanaPDA(bytes32 program_id, bytes memory seeds) public view returns(bytes32) {
        return CALL_SOLANA.getSolanaPDA(program_id, seeds);
    }

    function testIterativeComposability(
        uint8 swapsCount,
        address router,
        address[] calldata path,
        bytes memory seed,
        uint8 decimals
    ) external payable {

        // EVM logic to trigger iterative execution
        for(uint8 i = 0; i < swapsCount; i++) {
            IPancakeRouter01(router).swapExactETHForTokens
                {value: msg.value / swapsCount}
            (
                0,
                path,
                msg.sender,
                block.timestamp
            );
        }

        // Composability requests

        // Format createAccountWithSeed instruction
        (   bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = formatCreateAccountWithSeedInstruction(seed);
        // Prepare createAccountWithSeed instruction
        bytes memory createAccountWithSeedIx = CallSolanaHelperLib.prepareSolanaInstruction(
            SYSTEM_PROGRAM_ID,
            accounts,
            isSigner,
            isWritable,
            data
        );
        // Execute createAccountWithSeed instruction, sending 1461600 lamports
        CALL_SOLANA.execute(1461600, createAccountWithSeedIx);

        // Format initializeMint2 instruction
        (   accounts,
            isSigner,
            isWritable,
            data
        ) = formatInitializeMint2Instruction(decimals, accounts[1], accounts[1]);
        // Prepare initializeMint2 instruction
        bytes memory initializeMint2Ix = CallSolanaHelperLib.prepareSolanaInstruction(
            TOKEN_PROGRAM_ID,
            accounts,
            isSigner,
            isWritable,
            data
        );
        // Execute initializeMint2 instruction
        CALL_SOLANA.execute(0, initializeMint2Ix);
    }

    function formatCreateAccountWithSeedInstruction(
        bytes memory seed
    ) public view returns (
        bytes32[] memory accounts,
        bool[] memory isSigner,
        bool[] memory isWritable,
        bytes memory data
    ) {
        bytes32 basePubKey = CALL_SOLANA.getNeonAddress(address(this));

        accounts = new bytes32[](3);
        accounts[0] = CALL_SOLANA.getPayer();
        accounts[1] = sha256(abi.encodePacked(basePubKey, seed, TOKEN_PROGRAM_ID)); // Calculate createWithSeed account
        accounts[2] = basePubKey;

        isSigner = new bool[](3);
        isSigner[0] = true;
        isSigner[1] = false;
        isSigner[2] = true;

        isWritable = new bool[](3);
        isWritable[0] = true;
        isWritable[1] = true;
        isWritable[2] = false;

        data = abi.encodePacked(
            bytes4(0x03000000), // Instruction variant
            basePubKey, // Base public key used for accout  creation
            bytes8(0x1100000000000000), // Temporary: figure out how to get seed's bytes length in little-endian format
            seed,
            bytes8(0x604d160000000000), // Rent exemption balance for created account (1461600 lamports, right-padded little endian)
            bytes8(0x5200000000000000), // Storage space for created account (82 bytes, right-padded little endian)
            TOKEN_PROGRAM_ID // SPL Token program id
        );
    }

    function formatInitializeMint2Instruction(
        uint8 decimals,
        bytes32 mintAuthority,
        bytes32 freezeAuthority
    ) public view returns (
        bytes32[] memory accounts,
        bool[] memory isSigner,
        bool[] memory isWritable,
        bytes memory data
    ) {
        accounts = new bytes32[](1);
        accounts[0] = mintAuthority;

        isSigner = new bool[](1);
        isSigner[0] = false;

        isWritable = new bool[](1);
        isWritable[0] = true;

        data = abi.encodePacked(
            bytes1(0x14), // Instruction variant
            bytes1(decimals), // Token's decimals value
            mintAuthority, // Token's mint authority account
            bytes1(0x01), // Not sure what this byte is for
            freezeAuthority // Token's freeze authority account
        );
    }
}
