require('@nomicfoundation/hardhat-ethers');
require('dotenv').config();

module.exports = {
  solidity: {
    compilers: [
        {
            version: '0.8.28',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200,
                }
            },
        },
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999
          }
        }
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999
          }
        }
      },
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999
          }
        }
      },
      {
        version: '0.4.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999
          }
        }
      },
      {
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999
          }
        }
      }
    ]
  },
  networks: {
    neondevnet: {
      url: 'https://devnet.neonevm.org',
      accounts: [process.env.DEPLOYER_KEY],
      chainId: 245022926,
      allowUnlimitedContractSize: false,
      gasMultiplier: 2,
      maxFeePerGas: '10000000000000',
      maxPriorityFeePerGas: '5000000000000'
    },
    neonmainnet: {
      url: 'https://neon-proxy-mainnet.solana.p2p.org',
      accounts: [process.env.DEPLOYER_KEY],
      chainId: 245022934,
      allowUnlimitedContractSize: false,
      gas: 'auto',
      gasPrice: 'auto'
    },
    curvestand: {
      url: process.env.NEON_EVM_NODE,
      accounts: [process.env.DEPLOYER_KEY],
      allowUnlimitedContractSize: false,
      gasMultiplier: 2,
      maxFeePerGas: 10000,
      maxPriorityFeePerGas: 5000
    }
  },
  mocha: {
    timeout: 2800000
  }
};
