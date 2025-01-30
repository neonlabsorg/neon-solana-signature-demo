# NeonEVM Pancakeswap Demo

This repository contains a set of hardhat scripts to deploy **Pancakeswap** exchange contracts along with **WNEON**, 
**ERC20ForSPLMintable** tokens and liquidity pools provisioned with liquidity.

## Install dependencies

Run `npm install`

## Set environment variables

The following environment variables must be set in a `.env` file (see `.env.example`):

- Private key of the deployer account `DEPLOYER_KEY`
- NeonEVM RPC endpoint `NEON_EVM_NODE`
- NeonEVM faucet API endpoint `NEON_FAUCET`

## Run setup script

Run `npm run setup-pancakeswap-curvestand`

This script will do the following on the `curvestand` network (RPC endpoint set as `NEON_EVM_NODE` environment variable):

- Deploy `WNEON` contract
- Deploy **Pancakeswap** exchange contracts `PancakeFactory` and `PancakeRouter`
- Deploy two `ERC20ForSPLMintable` tokens `TOKEN_A` and `TOKEN_B`
- Create two `PancakePair`s `WNEON-TOKEN_A` and `TOKEN_A-TOKEN_B`
- Provide liquidity to those pairs

Adding contracts addresses to `config.js` file will prevent deployment of those contracts during script execution.
