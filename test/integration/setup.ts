// Integration test setup
console.log('🧪 Setting up integration tests...');

// Extend Jest timeout for integration tests
jest.setTimeout(60000);

// Global setup for integration tests
beforeAll(() => {
  console.log('🚀 Starting integration test suite');
});

afterAll(() => {
  console.log('✅ Integration test suite completed');
});
