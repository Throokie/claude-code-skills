/**
 * 复制到剪贴板工具
 */
const { showSuccessToast, showErrorToast } = require('./toast');

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(text) {
  try {
    if (typeof wx !== 'undefined' && wx.setClipboardData) {
      // 微信小程序 API
      wx.setClipboardData({
        data: text,
        success: () => {
          showSuccessToast('已复制');
        },
        fail: () => {
          showErrorToast('复制失败');
        }
      });
      return true;
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // 浏览器 Clipboard API
      await navigator.clipboard.writeText(text);
      showSuccessToast('已复制');
      return true;
    } else {
      // Fallback: 创建临时 textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const success = document.execCommand('copy');
        if (success) {
          showSuccessToast('已复制');
        } else {
          showErrorToast('复制失败');
        }
        document.body.removeChild(textarea);
        return success;
      } catch (err) {
        showErrorToast('复制失败');
        document.body.removeChild(textarea);
        return false;
      }
    }
  } catch (error) {
    console.error('[Copy] Error:', error);
    showErrorToast('复制失败');
    return false;
  }
}

/**
 * 显示复制成功反馈
 * @param {string} message - 提示信息
 */
function showCopyFeedback(message = '暗号已复制') {
  showSuccessToast(message);
}

/**
 * 带反馈的复制
 * @param {string} text - 要复制的文本
 * @param {string} successMessage - 成功提示
 * @returns {Promise<boolean>}
 */
async function copyWithFeedback(text, successMessage = '暗号已复制') {
  const success = await copyToClipboard(text);
  if (success) {
    showSuccessToast(successMessage);
  }
  return success;
}

module.exports = {
  copyToClipboard,
  showCopyFeedback,
  copyWithFeedback
};
