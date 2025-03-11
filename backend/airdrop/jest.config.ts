import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '@utils/log': '<rootDir>/src/utils/log',
    '@utils/url': '<rootDir>/src/utils/url',
    '@services/airdrop': '<rootDir>/src/services/airdrop',
    '@environment': '<rootDir>/src/environment',
  },
  testEnvironmentOptions: { path: '.env' },
  testTimeout: 2e5,
  detectOpenHandles: false,
  forceExit: false
};
export default config;
