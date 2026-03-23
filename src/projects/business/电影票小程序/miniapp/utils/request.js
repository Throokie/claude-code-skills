/**
 * 请求拦截器工具
 * 基于微信小程序 wx.request API
 */
const { showToast, showErrorToast, hideToast } = require('./toast');
const { getErrorMessage } = require('./error-map');

// Token 存储键名
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// 请求基础 URL
const BASE_URL = 'http://localhost:8021/api/v1';

/**
 * 获取存储的 Token
 * @returns {string|null}
 */
function getToken() {
  if (typeof wx !== 'undefined' && wx.getStorageSync) {
    return wx.getStorageSync(TOKEN_KEY) || null;
  }
  // 开发环境 fallback
  return global.__mock_token || null;
}

/**
 * 设置 Token
 * @param {string} token
 */
function setToken(token) {
  if (typeof wx !== 'undefined' && wx.setStorageSync) {
    wx.setStorageSync(TOKEN_KEY, token);
  } else {
    global.__mock_token = token;
  }
}

/**
 * 请求拦截器 - 添加 Token 到 Headers
 * @param {Object} config - 请求配置
 * @returns {Object} 修改后的配置
 */
function requestInterceptor(config) {
  const token = getToken();

  // 确保 header 对象存在
  if (!config.header) {
    config.header = {};
  }

  if (token) {
    config.header['Authorization'] = `Bearer ${token}`;
  }

  config.header['Content-Type'] = 'application/json';

  return config;
}

/**
 * 响应拦截器 - 处理错误
 * @param {Object} response - 响应对象
 * @returns {Object} 处理后的响应
 */
function responseInterceptor(response) {
  // HTTP 状态码处理
  const statusCode = response.statusCode;

  if (statusCode >= 200 && statusCode < 300) {
    // 成功响应
    return response;
  }

  // 错误响应处理
  const errorData = response.data || {};
  const errorCode = errorData.error?.code || statusCode;
  const errorMessage = errorData.error?.message || response.data?.error || '请求失败';

  // 映射错误码到用户友好消息
  const userMessage = getErrorMessage(errorCode, errorMessage);

  // 特殊处理 401 - 需要重新登录
  if (statusCode === 401) {
    // 清除 Token
    setToken(null);
    // 跳转到登录页
    if (typeof wx !== 'undefined' && wx.reLaunch) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  }

  // 显示错误 Toast（可配置是否显示）
  if (response.config?.showErrorToast !== false) {
    showErrorToast(userMessage);
  }

  // 抛出错误，供调用方处理
  const error = new Error(userMessage);
  error.code = errorCode;
  error.statusCode = statusCode;
  error.originalData = errorData;

  throw error;
}

/**
 * 网络错误处理
 * @param {Object} error - 错误对象
 * @returns {Promise} 拒绝的 Promise
 */
function networkErrorHandler(error) {
  console.error('[Request Error]', error);

  let message = '网络连接失败，请检查网络设置';

  if (error.errMsg) {
    if (error.errMsg.includes('timeout')) {
      message = '请求超时，请重试';
    } else if (error.errMsg.includes('fail')) {
      message = '网络错误，请检查网络连接';
    }
  }

  showErrorToast(message);

  const wrappedError = new Error(message);
  wrappedError.code = 'NETWORK_ERROR';
  wrappedError.originalError = error;

  throw wrappedError;
}

/**
 * 封装的 request 方法
 * @param {Object} options - 请求选项
 * @returns {Promise} 响应数据
 */
function request(options) {
  // 应用请求拦截器
  const config = requestInterceptor({
    url: (options.url?.startsWith('http') ? '' : BASE_URL) + options.url,
    method: options.method || 'GET',
    data: options.data,
    header: options.header,
    timeout: options.timeout || 10000,
    showErrorToast: options.showErrorToast !== false,
    ...options
  });

  return new Promise((resolve, reject) => {
    if (typeof wx !== 'undefined' && wx.request) {
      wx.request({
        ...config,
        success: (response) => {
          try {
            const result = responseInterceptor(response);
            resolve(result.data);
          } catch (error) {
            reject(error);
          }
        },
        fail: (error) => {
          networkErrorHandler(error).catch(reject);
          reject(error);
        }
      });
    } else {
      // 开发环境 fallback - 使用 fetch
      console.log('[Request]', config.method, config.url);

      // Mock 响应（用于测试）
      if (global.__mock_response) {
        setTimeout(() => {
          if (global.__mock_response_error) {
            reject(new Error(global.__mock_response_error));
          } else {
            resolve(global.__mock_response);
          }
        }, 10);
      } else {
        resolve({ mock: 'response' });
      }
    }
  });
}

/**
 * 便捷请求方法
 */
const get = (url, data, options) => request({ url, method: 'GET', data, ...options });
const post = (url, data, options) => request({ url, method: 'POST', data, ...options });
const put = (url, data, options) => request({ url, method: 'PUT', data, ...options });
const del = (url, data, options) => request({ url, method: 'DELETE', data, ...options });

module.exports = {
  request,
  get,
  post,
  put,
  del,
  requestInterceptor,
  responseInterceptor,
  networkErrorHandler,
  getToken,
  setToken,
  TOKEN_KEY
};
