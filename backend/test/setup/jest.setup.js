require('dotenv').config({ path: '.env.test' });

// Aumentar timeout significativamente
jest.setTimeout(120000);

// Suprimir logs durante tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};