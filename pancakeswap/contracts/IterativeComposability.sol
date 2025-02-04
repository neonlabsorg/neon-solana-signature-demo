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

    function testIterativeComposability(
        uint8 swapsCount,
        address router,
        address[] calldata path,
        bytes memory createAccountWithSeedIx,
        uint64 createAccountWithSeedLamports,
        bytes memory initializeMint2Ix,
        uint64 initializeMint2Lamports
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

        // Composability requests (createAccountWithSeed + initializeMint2)
        CALL_SOLANA.execute(createAccountWithSeedLamports, createAccountWithSeedIx);
        CALL_SOLANA.execute(initializeMint2Lamports, initializeMint2Ix);
    }

    function testIterativeComposabilityWithIxFormatting(
        uint8 swapsCount,
        address router,
        address[] calldata path,
        bytes32[] memory createAccountWithSeedIxAccounts,
        bool[] memory createAccountWithSeedIxIsSigner,
        bool[] memory createAccountWithSeedIxIsWritable,
        bytes memory createAccountWithSeedIxData,
        uint64 createAccountWithSeedLamports,
        bytes32 initializeMint2IxAccount,
        bytes memory initializeMint2IxData
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

        // Composability requests (createAccountWithSeed + initializeMint2)
        bytes memory createAccountWithSeedIx = CallSolanaHelperLib.prepareSolanaInstruction(
            SYSTEM_PROGRAM_ID,
            createAccountWithSeedIxAccounts,
            createAccountWithSeedIxIsSigner,
            createAccountWithSeedIxIsWritable,
            createAccountWithSeedIxData
        );
        bytes32[] memory initializeMint2IxAccounts = new bytes32[](1);
        initializeMint2IxAccounts[0] = initializeMint2IxAccount;
        bool[] memory initializeMint2IxIsSigner = new bool[](1);
        initializeMint2IxIsSigner[0] = false;
        bool[] memory initializeMint2IxIsWritable = new bool[](1);
        initializeMint2IxIsWritable[0] = true;
        bytes memory initializeMint2Ix = CallSolanaHelperLib.prepareSolanaInstruction(
            TOKEN_PROGRAM_ID,
            initializeMint2IxAccounts,
            initializeMint2IxIsSigner,
            initializeMint2IxIsWritable,
            initializeMint2IxData
        );
        CALL_SOLANA.execute(createAccountWithSeedLamports, createAccountWithSeedIx);
        CALL_SOLANA.execute(0, initializeMint2Ix);
    }
}
