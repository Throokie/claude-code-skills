/**
 * TicketCode 取票暗号组件
 * 支持一键复制和自动折叠
 */
const { isCodeExpired, getTicketCodeStyle } = require('../../utils/ticket-helper');
const { copyWithFeedback } = require('../../utils/copy');

// Mock wx for testing
if (typeof wx === 'undefined') {
  global.wx = {};
}

/**
 * TicketCode 组件类
 */
class TicketCodeComponent {
  constructor(options = {}) {
    this.code = options.code || '';
    this.showTime = options.showTime || '';
    this.onCopy = options.onCopy || (() => {});
    this.expired = false;
    this.blurred = false;
    this.hint = '';
    this.showCopyButton = true;
  }

  /**
   * 初始化组件
   */
  init() {
    this.updateStatus();
    return this;
  }

  /**
   * 更新状态
   */
  updateStatus() {
    if (!this.showTime) {
      this.expired = false;
      this.blurred = false;
      this.hint = '无排期时间';
      this.showCopyButton = false;
      return;
    }

    this.expired = isCodeExpired(this.showTime);
    const style = getTicketCodeStyle(this.showTime);

    this.blurred = style.blurred;
    this.hint = style.hint;
    this.showCopyButton = style.showCopyButton;
  }

  /**
   * 处理复制按钮点击
   */
  async onCopyClick() {
    if (this.expired || !this.code) {
      return false;
    }

    const success = await copyWithFeedback(this.code, '暗号已复制');
    if (success) {
      this.onCopy(this.code);
    }
    return success;
  }

  /**
   * 获取组件样式
   */
  getStyle() {
    const baseStyle = {
      opacity: this.expired ? 0.5 : 1,
      filter: this.blurred ? 'blur(4px)' : 'none',
      cursor: this.expired ? 'not-allowed' : 'pointer'
    };

    if (this.expired) {
      baseStyle.borderColor = '#ccc';
      baseStyle.color = '#999';
    } else {
      baseStyle.borderColor = '#07c160';
      baseStyle.color = '#333';
    }

    return baseStyle;
  }

  /**
   * 获取可复制的暗号（未过期时）
   */
  getCopyableCode() {
    if (this.expired) {
      return null;
    }
    return this.code;
  }

  /**
   * 组件数据（用于渲染）
   */
  getData() {
    return {
      code: this.code,
      hint: this.hint,
      expired: this.expired,
      blurred: this.blurred,
      showCopyButton: this.showCopyButton,
      style: this.getStyle()
    };
  }
}

/**
 * 创建 TicketCode 组件
 * @param {Object} options - 配置选项
 * @returns {TicketCodeComponent}
 */
function createTicketCode(options) {
  return new TicketCodeComponent(options).init();
}

/**
 * 检查暗号是否可复制
 * @param {string} showTime - 放映时间
 * @returns {boolean}
 */
function isCodeCopyable(showTime) {
  return !isCodeExpired(showTime);
}

module.exports = {
  TicketCodeComponent,
  createTicketCode,
  isCodeCopyable
};
