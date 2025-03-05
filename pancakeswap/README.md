# NeonEVM Pancakeswap Demo

This repository contains a set of hardhat scripts to deploy **Pancakeswap** exchange contracts along with **WNEON**, 
**ERC20ForSPLMintable** tokens and liquidity pools provisioned with liquidity.

## Install dependencies

Run `npm install`

## Set environment variables

The following environment variables must be set in a `.env` file (see `.env.example`):

- Private key of the deployer account `DEPLOYER_KEY`
- Private key of the Solana payer account `SOLANA_WALLET`
- NeonEVM RPC endpoint `NEON_EVM_NODE`
- Solana RPC endpoint `SOLANA_RPC_NODE`
- NeonEVM faucet API endpoint `NEON_FAUCET`

## Run setup script

```bash
npm run deploy
```

This script will do the following on the `curvestand` network (RPC endpoint set as `NEON_EVM_NODE` environment variable):

- Deploy `WNEON` contract
- Deploy **Pancakeswap** exchange contracts `PancakeFactory` and `PancakeRouter`
- Deploy two `ERC20ForSPLMintable` tokens `TOKEN_A` and `TOKEN_B`
- Deploy two `ERC20ForSPLMintableV2` tokens `TOKEN_Av2` and `TOKEN_Bv2`
- Create `PancakePair`s `WNEON-TOKEN_A`, `WNEON-TOKEN_B`, `TOKEN_A-TOKEN_B`, `TOKEN_Av2-TOKEN_Bv2`
- Provide liquidity to those pairs

Adding contracts addresses to `config.js` file will prevent deployment of those contracts during script execution.

```shell
npm run airdrop
```

This script distributes tokens for all accounts specified in the `.env` config.

