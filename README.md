# Neon Solana Native Swap Demo

A demonstration of token swaps in Neon EVM using Solana signature verification, showcasing how users with Solana wallets can interact with EVM smart contracts on Neon EVM.

## About this Demo

### Purpose

This demo demonstrates that users with a Solana wallet can, through this SDK, interact with EVM smart contracts on the Neon EVM.

The demo showcases how to perform token swaps in Neon EVM via the Solana signer library, integrating Solana's native tokens and user base with Neon EVM's smart contract environment.

For more information, visit the [Solana Native documentation](https://neonevm.org/docs/composability/sdk_solana_native).

### How It Works

The demo implements several key components:

1. **Smart Contracts**: Deploys PancakeSwap exchange contracts on Neon EVM, including a factory and router
2. **Token Creation**: Creates ERC20ForSPL tokens for testing purposes
3. **Liquidity Pools**: Sets up liquidity pools for token pairs
4. **Frontend Interface**: Provides a UI for performing token swaps
5. **Proxy Server**: Handles cross-origin requests and other middleware functionality

The process flow involves:
- Creating scheduled Neon EVM transactions
- Signing them with Solana wallet credentials
- Submitting them to the Neon EVM network via Solana
- Monitoring transaction status

### Repository Structure

```
├── frontend
│   └── swap-ui            # React-based UI for performing token swaps
├── pancakeswap            # Scripts and configuration for PancakeSwap deployment
│   ├── scripts            # Deployment and configuration scripts
```

### Prerequisites

- Node.js (v16+)
- Yarn package manager
- Solana CLI tools
- A Solana wallet with SOL tokens (for devnet)
- Basic understanding of:
  - Solidity and EVM-compatible smart contracts
  - Token swaps and liquidity pools
  - Solana transaction model

## Getting Started

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/neonlabsorg/neon-solana-native-swap-demo.git
cd neon-solana-native-swap-demo
```

2. Configure environment variables:

For the frontend:
```bash
cd frontend/swap-ui
cp .env.example .env
# Edit .env with your configuration
```

For PancakeSwap deployment:
```bash
cd pancakeswap
cp .env.example .env
# Edit .env with your configuration
```

Key environment variables:

```
# Backend & Frontend
VITE_PROXY_ENV: devnet
VITE_SOLANA_URL: https://api.devnet.solana.com
VITE_NEON_CORE_API_RPC_URL: https://devnet.neonevm.org

# Wallet Private Keys (Never commit these to git!)
VITE_SOLANA_WALLET: <your_solana_private_key_in_bs58>
VITE_NEON_WALLET: <your_neon_private_key>

# PancakeSwap Deployment
DEPLOYER_KEY: <your_evm_private_key>
SOLANA_WALLET: <your_solana_private_key_in_bs58>
NEON_EVM_NODE: https://devnet.neonevm.org
NEON_FAUCET: https://api.neonfaucet.org/request_neon
SOLANA_RPC_NODE: https://api.devnet.solana.com
```

### Deployment

#### Deploy Smart Contracts on Devnet

1. Install dependencies:
```bash
cd pancakeswap
npm install
```

2. Run the PancakeSwap setup script for deploying all contracts:
```bash
npm run deploy
npm run airdrop
```

This script will:
- Deploy WNEON contract
- Deploy PancakeSwap exchange contracts (Factory and Router)
- Deploy ERC20ForSPL tokens (both v1 and v2 variants)
- Create token pairs and provide initial liquidity
- Save all contract addresses to the artifacts folder

For more PancakeSwap deployment details, see `/pancakeswap/README.md`.

#### Build and Run the Frontend

1. Install dependencies:
```bash
cd frontend/swap-ui
yarn install
```

2. Start development server:
```bash
yarn dev
```

### Running the Demo

1. Open the frontend application in your browser (typically at http://localhost:5173)
2. Connect your Solana wallet (Phantom or another compatible wallet)
3. Request tokens for testing:
```bash
cd pancakeswap
npm run airdrop
```

This will mint test tokens and transfer them to your wallet.

4. Use the swap interface to exchange tokens

### Adapting for Your Own Use

To adapt this demo for your own purposes:

1. Replace token symbols and names in `pancakeswap/scripts/deploy-tokens.js`

2. Modify the token amounts and liquidity pool configurations in `pancakeswap/scripts/create-liquidity-pools.js`

3. Update the frontend UI in `frontend/swap-ui/src` to match your branding

### Mainnet Deployment Considerations

When deploying to mainnet:

1. Update network configurations in `.env` files:
   - Use mainnet RPC endpoints
   - Remove faucet configurations

2. Ensure sufficient SOL and NEON balances in deployment wallets

3. Update hardhat configuration in `pancakeswap/hardhat.config.js` to use mainnet settings

4. Implement proper error handling and transaction monitoring for production use

5. Consider security audits for any contract modifications

6. Implement proper key management (never store private keys in code or env files on production)

## Additional Resources

- [Solana Native SDK Documentation](https://neonevm.org/docs/composability/sdk_solana_native)
- [Neon EVM Documentation](https://neonevm.org/docs/quick_start)
- [Solana Documentation](https://solana.com/docs)

## License

MIT
