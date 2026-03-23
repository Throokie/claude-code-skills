/**
 * 错误码映射表
 * 将后端错误码映射为用户友好的中文提示
 */

const ERROR_MESSAGES = {
  // ========== 认证授权错误 (1001-1999) ==========
  1001: '认证失败，请重新登录',
  1002: '登录已过期，请重新登录',
  1003: 'Token 无效，请重新登录',
  1004: '权限不足，无法访问',
  1005: '未授权访问，请先登录',

  // ========== 业务逻辑错误 (2001-2999) ==========
  2001: '参数验证失败，请检查输入',
  2002: '资源不存在',
  2003: '资源冲突，无法操作',

  // 订单相关 (2010-2019)
  2010: '订单操作失败',
  2011: '订单不存在',
  2012: '订单状态不允许此操作',

  // 支付相关 (2020-2029)
  2020: '支付操作失败',
  2021: '支付失败，请重试',

  // 退款相关 (2030-2039)
  2030: '退款操作失败',
  2031: '退款失败，请联系客服',

  // 排期相关 (2040-2049)
  2040: '排期操作失败',

  // ========== 系统错误 (3001-3999) ==========
  3000: '服务器内部错误',
  3001: '数据库操作失败',
  3002: '系统繁忙，请稍后再试',

  // ========== HTTP 状态码映射 ==========
  400: '请求参数错误',
  401: '未授权，请先登录',
  403: '禁止访问',
  404: '请求的资源不存在',
  408: '请求超时，请重试',
  500: '服务器错误，请稍后再试',
  502: '服务暂时不可用',
  503: '服务过载，请稍后再试',
  504: '网关超时'
};

/**
 * 根据错误码获取用户友好消息
 * @param {number|string} code - 错误码
 * @param {string} defaultMessage - 默认消息（当找不到映射时）
 * @returns {string} 用户友好的错误消息
 */
function getErrorMessage(code, defaultMessage = '操作失败，请稍后再试') {
  const codeNum = typeof code === 'string' ? parseInt(code, 10) : code;
  return ERROR_MESSAGES[codeNum] || defaultMessage;
}

/**
 * 批量获取错误消息
 * @param {number[]} codes - 错误码数组
 * @returns {Object} 错误码到消息的映射
 */
function getErrorMessages(codes) {
  const result = {};
  codes.forEach(code => {
    result[code] = getErrorMessage(code);
  });
  return result;
}

module.exports = {
  ERROR_MESSAGES,
  getErrorMessage,
  getErrorMessages
};
