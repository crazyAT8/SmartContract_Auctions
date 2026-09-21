const {
  validateEnv,
  collectProductionEnvErrors,
  isLocalRpcUrl,
  isLocalAppUrl,
  normalizePrivateKey,
  HARDHAT_DEFAULT_PRIVATE_KEYS,
} = require('../config/validateEnv');

const PROD_DEPLOYMENTS = JSON.stringify({
  network: { name: 'sepolia', chainId: '11155111' },
  contracts: {
    dutchAuction: '0x1111111111111111111111111111111111111111',
    englishAuction: '0x2222222222222222222222222222222222222222',
  },
});

const LOCAL_DEPLOYMENTS = JSON.stringify({
  network: { name: 'localhost', chainId: '1337' },
  contracts: {
    dutchAuction: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
});

function mockRead(json) {
  return () => json;
}

const validProdEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://appuser:Str0ngPass!@db.example.com:5432/auction_dapp?sslmode=require',
  JWT_SECRET: 'a'.repeat(48),
  REDIS_HOST: 'redis.example.com',
  REDIS_PORT: '6379',
  ETHEREUM_RPC_URL: 'https://sepolia.infura.io/v3/abc123',
  PRIVATE_KEY: '0x' + '11'.repeat(32),
  FRONTEND_URL: 'https://app.example.com',
};

describe('validateEnv', () => {
  it('isLocalRpcUrl detects localhost and Hardhat', () => {
    expect(isLocalRpcUrl('http://localhost:8545')).toBe(true);
    expect(isLocalRpcUrl('http://hardhat:8545')).toBe(true);
    expect(isLocalRpcUrl('https://sepolia.infura.io/v3/x')).toBe(false);
  });

  it('isLocalAppUrl detects loopback', () => {
    expect(isLocalAppUrl('http://localhost:3000')).toBe(true);
    expect(isLocalAppUrl('https://app.example.com')).toBe(false);
  });

  it('flags Hardhat default private keys', () => {
    const hh0 = [...HARDHAT_DEFAULT_PRIVATE_KEYS][0];
    expect(HARDHAT_DEFAULT_PRIVATE_KEYS.has(normalizePrivateKey('0x' + hh0))).toBe(true);

    const errors = collectProductionEnvErrors(
      { ...validProdEnv, PRIVATE_KEY: '0x' + hh0 },
      { readFileSync: mockRead(PROD_DEPLOYMENTS) }
    );
    expect(errors.some((e) => e.includes('Hardhat'))).toBe(true);
  });

  it('flags localhost deployments.json', () => {
    const errors = collectProductionEnvErrors(validProdEnv, {
      readFileSync: mockRead(LOCAL_DEPLOYMENTS),
      deploymentsPath: '/tmp/deployments.json',
    });
    expect(errors.some((e) => e.includes('local Hardhat'))).toBe(true);
  });

  it('flags placeholder JWT and local DB/Redis', () => {
    const errors = collectProductionEnvErrors(
      {
        ...validProdEnv,
        JWT_SECRET: 'your_jwt_secret_here',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/auction_dapp',
        REDIS_HOST: 'localhost',
        ETHEREUM_RPC_URL: 'http://localhost:8545',
        FRONTEND_URL: 'http://localhost:3000',
      },
      { readFileSync: mockRead(PROD_DEPLOYMENTS) }
    );
    expect(errors.length).toBeGreaterThan(3);
  });

  it('passes a complete production config', () => {
    const errors = collectProductionEnvErrors(validProdEnv, {
      readFileSync: mockRead(PROD_DEPLOYMENTS),
    });
    expect(errors).toEqual([]);
  });

  it('validateEnv is a no-op outside production', () => {
    expect(validateEnv({ NODE_ENV: 'development' })).toEqual([]);
    expect(validateEnv({ NODE_ENV: 'test' })).toEqual([]);
  });

  it('validateEnv throws in production when invalid', () => {
    expect(() =>
      validateEnv(
        { NODE_ENV: 'production' },
        { readFileSync: mockRead(PROD_DEPLOYMENTS) }
      )
    ).toThrow(/Production environment validation failed/);
  });
});
