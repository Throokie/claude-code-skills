/**
 * 取票暗号 helper 工具
 * 处理暗号过期逻辑和样式
 */

// 暗号过期时间：开场后 2 小时
const CODE_EXPIRE_HOURS = 2;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * 判断暗号是否已过期
 * @param {string} showTimeStr - 放映时间字符串 (ISO 格式或时间戳)
 * @returns {boolean} 是否过期
 */
function isCodeExpired(showTimeStr) {
  const showTime = new Date(showTimeStr);
  const expireTime = showTime.getTime() + (CODE_EXPIRE_HOURS * MS_PER_HOUR);
  return Date.now() > expireTime;
}

/**
 * 判断暗号是否即将过期（30 分钟内）
 * @param {string} showTimeStr - 放映时间字符串
 * @returns {boolean} 是否即将过期
 */
function isCodeExpiringSoon(showTimeStr) {
  const showTime = new Date(showTimeStr);
  const expireTime = showTime.getTime() + (CODE_EXPIRE_HOURS * MS_PER_HOUR);
  const timeUntilExpiry = expireTime - Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  return timeUntilExpiry > 0 && timeUntilExpiry <= THIRTY_MINUTES;
}

/**
 * 获取暗号过期剩余时间（分钟）
 * @param {string} showTimeStr - 放映时间字符串
 * @returns {number} 剩余分钟数，已过期的返回 0
 */
function getRemainingMinutes(showTimeStr) {
  const showTime = new Date(showTimeStr);
  const expireTime = showTime.getTime() + (CODE_EXPIRE_HOURS * MS_PER_HOUR);
  const remaining = expireTime - Date.now();

  if (remaining <= 0) return 0;

  return Math.floor(remaining / MS_PER_HOUR * 60);
}

/**
 * 获取暗号的显示样式
 * @param {string} showTimeStr - 放映时间字符串
 * @returns {Object} 样式对象
 */
function getTicketCodeStyle(showTimeStr) {
  if (isCodeExpired(showTimeStr)) {
    return {
      disabled: true,
      blurred: true,
      hint: '暗号已过期',
      showCopyButton: false,
      opacity: 0.5,
      borderColor: '#ccc',
      color: '#999'
    };
  }

  if (isCodeExpiringSoon(showTimeStr)) {
    return {
      disabled: false,
      blurred: false,
      hint: '暗号即将过期，请尽快使用',
      showCopyButton: true,
      opacity: 1,
      borderColor: '#ff9800',
      color: '#ff9800',
      warning: true
    };
  }

  return {
    disabled: false,
    blurred: false,
    hint: '点击复制暗号',
    showCopyButton: true,
    opacity: 1,
    borderColor: '#07c160',
    color: '#07c160',
    warning: false
  };
}

/**
 * 格式化过期时间显示
 * @param {string} showTimeStr - 放映时间字符串
 * @returns {string} 格式化的过期时间
 */
function formatExpireTime(showTimeStr) {
  const showTime = new Date(showTimeStr);
  const expireTime = new Date(showTime.getTime() + (CODE_EXPIRE_HOURS * MS_PER_HOUR));

  const hours = expireTime.getHours().toString().padStart(2, '0');
  const minutes = expireTime.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

module.exports = {
  isCodeExpired,
  isCodeExpiringSoon,
  getRemainingMinutes,
  getTicketCodeStyle,
  formatExpireTime,
  CODE_EXPIRE_HOURS
};
