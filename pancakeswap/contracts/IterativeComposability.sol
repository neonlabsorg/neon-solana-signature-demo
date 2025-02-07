// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { CallSolanaHelperLib } from './CallSolanaHelperLib.sol';
import { ICallSolana } from './ICallSolana.sol';
import { IPancakeRouter01 } from './pancakeswap/interfaces/IPancakeRouter01.sol';

contract IterativeComposability {

    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    bytes32 public constant SYSTEM_PROGRAM_ID = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 public constant TOKEN_PROGRAM_ID = 0x06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9;

    bytes32 public tokenMint;

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

    function getResourceAddress(bytes memory seed) public view returns(bytes32) {
        return CALL_SOLANA.getResourceAddress(keccak256(seed));
    }

    function getCreateWithSeedAccount(bytes32 basePubKey, bytes memory seed) public view returns(bytes32) {
        return sha256(abi.encodePacked(basePubKey, seed, TOKEN_PROGRAM_ID));
    }

    function createResource(bytes memory seed, uint64 space, uint64 lamports, bytes32 owner) public returns(bytes32) {
        return CALL_SOLANA.createResource(keccak256(seed), space, lamports, owner);
    }

    function testCreateInitializeTokenMint(bytes memory seed, uint8 decimals) external payable {
        // Create SPL token mint account
        tokenMint = CALL_SOLANA.createResource(
            keccak256(seed), // salt
            82, // space
            1461600, // lamports
            TOKEN_PROGRAM_ID // Owner must be SPL Token program
        );

        bytes32 authority = CALL_SOLANA.getNeonAddress(address(this));
        // Format initializeMint2 instruction
        (   bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = formatInitializeMint2Instruction(
            decimals,
            tokenMint,
            authority,
            authority
        );

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

    function testMintTokens(bytes32 _tokenMint, bytes32 recipientATA, uint64 amount) external payable {
        // Format mintTo instruction
        (   bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = formatMintToInstruction(_tokenMint, recipientATA, amount);
        // Prepare mintTo instruction
        bytes memory mintToIx = CallSolanaHelperLib.prepareSolanaInstruction(
            TOKEN_PROGRAM_ID,
            accounts,
            isSigner,
            isWritable,
            data
        );
        // Execute mintTo instruction
        CALL_SOLANA.execute(0, mintToIx);
    }

    function testIterativeComposability(
        uint8 swapsCount,
        address router,
        address[] calldata path,
        bytes memory seed,
        uint8 decimals
    ) external payable {
        /*
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
        */
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

        // bytes32 authority = keccak256('SPL Token mint/freeze authority');
        // Format initializeMint2 instruction
        (   accounts,
            isSigner,
            isWritable,
            data
        ) = formatInitializeMint2Instruction(decimals, accounts[1], accounts[2], accounts[2]);
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
            basePubKey, // Base public key used for account  creation
            // bytes8(0x1100000000000000), // Temporary: figure out how to get seed's bytes length in little-endian format
            bytes8(convertUintToLittleEndianBytes32(uint256(seed.length))),
            seed,
            bytes8(0x604d160000000000), // Rent exemption balance for created account (1461600 lamports, right-padded little endian)
            bytes8(0x5200000000000000), // Storage space for created account (82 bytes, right-padded little endian)
            TOKEN_PROGRAM_ID // SPL Token program id
        );
    }

    function formatInitializeMint2Instruction(
        uint8 decimals,
        bytes32 tokenMint,
        bytes32 mintAuthority,
        bytes32 freezeAuthority
    ) public view returns (
        bytes32[] memory accounts,
        bool[] memory isSigner,
        bool[] memory isWritable,
        bytes memory data
    ) {
        accounts = new bytes32[](1);
        accounts[0] = tokenMint;

        isSigner = new bool[](1);
        isSigner[0] = false;

        isWritable = new bool[](1);
        isWritable[0] = true;

        data = abi.encodePacked(
            bytes1(0x14), // Instruction variant (see: https://github.com/solana-program/token/blob/08aa3ccecb30692bca18d6f927804337de82d5ff/program/src/instruction.rs#L558)
            bytes1(decimals), // Token's decimals value
            mintAuthority, // Token's mint authority account
            bytes1(0x01), // Flag set to 1, indicating that freezeAuthority account is provided next and should be unpacked (see: https://github.com/solana-program/token/blob/08aa3ccecb30692bca18d6f927804337de82d5ff/program/src/instruction.rs#L561)
            freezeAuthority // Token's freeze authority account
        );
    }

    function formatMintToInstruction(
        bytes32 tokenMint,
        bytes32 recipientATA,
        uint64 amount
    ) public view returns (
        bytes32[] memory accounts,
        bool[] memory isSigner,
        bool[] memory isWritable,
        bytes memory data
    ) {
        bytes32 mintAuthority = CALL_SOLANA.getNeonAddress(address(this));

        accounts = new bytes32[](1);
        accounts[0] = tokenMint;
        accounts[1] = recipientATA;
        accounts[2] = mintAuthority;

        isSigner = new bool[](1);
        isSigner[0] = false;
        isSigner[1] = false;
        isSigner[2] = true;

        isWritable = new bool[](1);
        isWritable[0] = true;
        isWritable[1] = true;
        isWritable[2] = false;

        data = abi.encodePacked(
            bytes1(0x07), // Instruction variant (see: https://github.com/solana-program/token/blob/08aa3ccecb30692bca18d6f927804337de82d5ff/program/src/instruction.rs#L508)
            bytes8(convertUintToLittleEndianBytes32(uint256(amount)))
        );
    }

    function convertUintToLittleEndianBytes32(uint256 bigEndian) public pure returns (bytes32) {
        assembly {
            // Assign return data position
            let pos := mload(0x40)
            // Store little-endian bytes in memory
            for {let i := 0} lt(i, 32) {i := add(i, 1)} {
                let nextBEByte := byte(sub(31, i), bigEndian) // Get BE bytes starting from the right
                let nextLEByte := shl(sub(248, mul(i, 8)), nextBEByte) // Shift left to get LE bytes
                let currentValue := mload(pos)
                let newValue := add(currentValue, nextLEByte) // Add LE bytes to return value
                mstore(pos, newValue) // Update return value in memory
            }
            // Assign return data start position
            let position := mload(0x40)
            // Update free memory pointer
            mstore(0x40, add(mload(0x40), 0x20))
            // Return
            return(position, 0x20)
        }
    }
}
