export const addressesMainnet = {
  tokensV1: [
    {
      address: '0xe6E1268960978050ad4695486F13C06313D5F7e9',
      address_spl: 'BYu6dhZaqqKzCzLGPeduokW7zKe6ByZcmJN754EPckPr',
      name: 'USDC (Fake)',
      symbol: 'FAKE_USDC',
      decimals: 6
    },
    {
      address: '0xFc128eB4396c8F3C503b8475cf5A3De6374B10c1',
      address_spl: 'B1PpKV5zW1pTqwnuW4bTxWbLZznJFnz6DeFJeMsoyHXV',
      name: 'Wrapped SOL (Fake)',
      symbol: 'FAKE_wSOL',
      decimals: 9
    }
  ],
  tokensV2: [
  ],
  swap: {
    router: '0xAaf030aFc439e3A92924Cb210f2065A01D151835',
    factory: '0xEB30794248834AbCA090868D45bc36576435a064',
    pairs: {
      'fake_usdc/fake_wsol': {
        pair: '0xBDcE5eBb9DF4994a4d268B4ab885d84706191C28',
        a: '0xe6E1268960978050ad4695486F13C06313D5F7e9',
        b: '0xFc128eB4396c8F3C503b8475cf5A3De6374B10c1'
      },
      'fake_wsol/fake_usdc': {
        pair: '0xBDcE5eBb9DF4994a4d268B4ab885d84706191C28',
        a: '0xe6E1268960978050ad4695486F13C06313D5F7e9',
        b: '0xFc128eB4396c8F3C503b8475cf5A3De6374B10c1'
      }
    }
  },
  transfer: {
    neonTokenTransfer: ''
  },
  airdrop: [
    'BYu6dhZaqqKzCzLGPeduokW7zKe6ByZcmJN754EPckPr',
    'B1PpKV5zW1pTqwnuW4bTxWbLZznJFnz6DeFJeMsoyHXV'
  ]
};
