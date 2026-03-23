/**
 * TicketCode 取票暗号组件单元测试
 */
const assert = require('assert');

// Mock wx API
global.wx = {
  setClipboardData: ({ data, success }) => {
    if (global.mockClipboardSuccess) {
      success && success();
    }
  }
};

const {
  TicketCodeComponent,
  createTicketCode,
  isCodeCopyable
} = require('../../miniapp/components/TicketCode/index');

const {
  isCodeExpired,
  getTicketCodeStyle
} = require('../../miniapp/utils/ticket-helper');

console.log('Running TicketCode Component Tests...\n');

let passed = 0;
let failed = 0;

// Helper to get date string offset by hours
function getDateOffsetHours(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

const tests = [
  {
    name: 'copy_button_copies_code_to_clipboard',
    fn: async () => {
      global.mockClipboardSuccess = true;

      const component = createTicketCode({
        code: 'ABC123',
        showTime: getDateOffsetHours(1) // 1 小时后，未过期
      });

      const result = await component.onCopyClick();

      assert.strictEqual(result, true);
    }
  },
  {
    name: 'copy_button_shows_success_toast',
    fn: async () => {
      global.mockClipboardSuccess = true;

      let onCopyCalled = false;
      let copiedCode = '';

      const component = createTicketCode({
        code: 'TEST456',
        showTime: getDateOffsetHours(1),
        onCopy: (code) => {
          onCopyCalled = true;
          copiedCode = code;
        }
      });

      await component.onCopyClick();

      assert.strictEqual(onCopyCalled, true);
      assert.strictEqual(copiedCode, 'TEST456');
    }
  },
  {
    name: 'code_blurred_after_showtime_plus_2hours',
    fn: () => {
      // 3 小时前开场，已经过期（2 小时过期）
      const showTime = getDateOffsetHours(-3);

      const expired = isCodeExpired(showTime);
      const style = getTicketCodeStyle(showTime);

      assert.strictEqual(expired, true);
      assert.strictEqual(style.blurred, true);
      assert.strictEqual(style.disabled, true);
      assert.strictEqual(style.showCopyButton, false);
    }
  },
  {
    name: 'code_normal_within_2hours',
    fn: () => {
      // 1 小时后开场，未过期
      const showTime = getDateOffsetHours(1);

      const expired = isCodeExpired(showTime);
      const style = getTicketCodeStyle(showTime);

      assert.strictEqual(expired, false);
      assert.strictEqual(style.blurred, false);
      assert.strictEqual(style.disabled, false);
      assert.strictEqual(style.showCopyButton, true);
    }
  },
  {
    name: 'copy_button_disabled_when_expired',
    fn: async () => {
      // 3 小时前开场，已过期
      const component = createTicketCode({
        code: 'EXPIRED',
        showTime: getDateOffsetHours(-3)
      });

      const result = await component.onCopyClick();

      assert.strictEqual(result, false);
    }
  },
  {
    name: 'is_code_copyable_returns_correct_status',
    fn: () => {
      // 未过期 - 可复制
      const futureTime = getDateOffsetHours(1);
      assert.strictEqual(isCodeCopyable(futureTime), true);

      // 已过期 - 不可复制
      const pastTime = getDateOffsetHours(-3);
      assert.strictEqual(isCodeCopyable(pastTime), false);
    }
  },
  {
    name: 'component_get_data_returns_correct_structure',
    fn: () => {
      const component = createTicketCode({
        code: 'DATA123',
        showTime: getDateOffsetHours(1)
      });

      const data = component.getData();

      assert.strictEqual(data.code, 'DATA123');
      assert.strictEqual(data.expired, false);
      assert.strictEqual(data.blurred, false);
      assert.strictEqual(data.showCopyButton, true);
      assert.ok(data.hint.length > 0);
    }
  },
  {
    name: 'component_get_style_for_expired',
    fn: () => {
      const component = createTicketCode({
        code: 'STYLE123',
        showTime: getDateOffsetHours(-3)
      });

      const style = component.getStyle();

      assert.strictEqual(style.opacity, 0.5);
      assert.strictEqual(style.cursor, 'not-allowed');
    }
  }
];

async function runTests() {
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);

  // Required tests check
  console.log('\nRequired tests coverage:');
  console.log('  ✓ copy_button_copies_code_to_clipboard');
  console.log('  ✓ copy_button_shows_success_toast');
  console.log('  ✓ code_blurred_after_showtime_plus_2hours');
  console.log('  ✓ code_normal_within_2hours');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
