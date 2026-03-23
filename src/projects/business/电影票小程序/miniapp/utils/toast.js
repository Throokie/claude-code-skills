/**
 * Toast 提示工具
 * 基于微信小程序 wx.showToast API
 */

/**
 * 显示 Toast 提示
 * @param {string} message - 提示内容
 * @param {number} duration - 持续时间（毫秒），默认 2000ms
 * @param {string} icon - 图标类型：'success' | 'error' | 'loading' | 'none'
 */
function showToast(message, duration = 2000, icon = 'none') {
  if (typeof wx !== 'undefined' && wx.showToast) {
    wx.showToast({
      title: message,
      icon: icon,
      duration: duration,
      mask: true
    });
  } else {
    // 开发环境 fallback：使用 console 或 alert
    console.log(`[Toast] ${icon}: ${message}`);
    if (icon === 'error') {
      console.error(`[Toast Error] ${message}`);
    }
  }
}

/**
 * 显示错误 Toast
 * @param {string} message - 错误信息
 * @param {number} duration - 持续时间（毫秒），默认 2500ms
 */
function showErrorToast(message, duration = 2500) {
  return showToast(message, duration, 'error');
}

/**
 * 显示成功 Toast
 * @param {string} message - 成功信息
 * @param {number} duration - 持续时间（毫秒），默认 1500ms
 */
function showSuccessToast(message, duration = 1500) {
  return showToast(message, duration, 'success');
}

/**
 * 显示加载 Toast
 * @param {string} message - 加载提示
 */
function showLoadingToast(message = '加载中...') {
  return showToast(message, 0, 'loading');
}

/**
 * 隐藏 Toast
 */
function hideToast() {
  if (typeof wx !== 'undefined' && wx.hideToast) {
    wx.hideToast();
  }
}

module.exports = {
  showToast,
  showErrorToast,
  showSuccessToast,
  showLoadingToast,
  hideToast
};
