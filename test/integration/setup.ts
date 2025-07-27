// Integration test setup
console.log('🧪 Setting up integration tests...');

// Extend Jest timeout for integration tests
jest.setTimeout(60000);

// Global setup for integration tests
beforeAll(async () => {
  console.log('🚀 Starting integration test suite');
});

afterAll(async () => {
  console.log('✅ Integration test suite completed');
});
