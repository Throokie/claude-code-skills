/**
 * Request 拦截器单元测试
 * 使用简单测试框架（不依赖 Jest/Mocha）
 */
const assert = require('assert');

// Mock wx API with storage support
const mockStorage = {};
global.wx = {
  showToast: () => {},
  hideToast: () => {},
  getStorageSync: (key) => mockStorage[key] || null,
  setStorageSync: (key, value) => { mockStorage[key] = value; },
  request: () => {},
  reLaunch: () => {}
};

const {
  requestInterceptor,
  responseInterceptor,
  networkErrorHandler,
  getToken,
  setToken,
  TOKEN_KEY
} = require('../../miniapp/utils/request');

const { getErrorMessage } = require('../../miniapp/utils/error-map');
const { showErrorToast } = require('../../miniapp/utils/toast');

let passed = 0;
let failed = 0;

// Simple test runner
function runTests() {
  const tests = [
    { name: 'request_interceptor_adds_token_to_headers', fn: () => {
      mockStorage[TOKEN_KEY] = 'test_token_123';
      const config = { url: '/api/v1/orders', method: 'GET', header: {} };
      const result = requestInterceptor(config);
      assert.strictEqual(result.header['Authorization'], 'Bearer test_token_123');
      assert.strictEqual(result.header['Content-Type'], 'application/json');
    }},
    { name: 'request_interceptor_works_without_token', fn: () => {
      mockStorage[TOKEN_KEY] = null;
      const config = { url: '/api/v1/login', method: 'POST', header: {} };
      const result = requestInterceptor(config);
      assert.strictEqual(result.header['Authorization'], undefined);
    }},
    { name: 'response_interceptor_returns_success', fn: () => {
      const response = { statusCode: 200, data: { success: true }, config: {} };
      const result = responseInterceptor(response);
      assert.strictEqual(result.statusCode, 200);
    }},
    { name: 'error_mapping_auth_error', fn: () => {
      assert.strictEqual(getErrorMessage(1001), '认证失败，请重新登录');
    }},
    { name: 'error_mapping_order_not_found', fn: () => {
      assert.strictEqual(getErrorMessage(2011), '订单不存在');
    }},
    { name: 'error_mapping_default', fn: () => {
      assert.strictEqual(getErrorMessage(9999, '默认'), '默认');
    }},
    { name: 'get_set_token', fn: () => {
      mockStorage[TOKEN_KEY] = null;
      setToken('test');
      assert.strictEqual(getToken(), 'test');
    }}
  ];

  tests.forEach(test => {
    try {
      test.fn();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
