/**
 * PullRefresh 下拉刷新组件
 * 用于订单页面的下拉刷新功能
 */

// 下拉刷新状态
const PULL_STATUS = {
  IDLE: 'idle',           // 初始状态
  PULLING: 'pulling',     // 下拉中
  READY: 'ready',         // 达到刷新阈值
  REFRESHING: 'refreshing' // 刷新中
};

// 刷新阈值（px）
const REFRESH_THRESHOLD = 80;
// 最大下拉距离（px）
const MAX_PULL_DISTANCE = 120;

/**
 * PullRefresh 组件逻辑
 */
class PullRefreshController {
  constructor(options = {}) {
    this.status = PULL_STATUS.IDLE;
    this.pullDistance = 0;
    this.startY = 0;
    this.onRefresh = options.onRefresh || (() => Promise.resolve());
    this.onStatusChange = options.onStatusChange || (() => {});
  }

  /**
   * 触摸开始
   */
  onTouchStart(event) {
    if (this.status === PULL_STATUS.REFRESHING) return;

    this.startY = event.touches[0].pageY;
    this.setStatus(PULL_STATUS.PULLING);
  }

  /**
   * 触摸移动
   */
  onTouchMove(event) {
    if (this.status !== PULL_STATUS.PULLING) return;

    const currentY = event.touches[0].pageY;
    const diff = currentY - this.startY;

    // 只允许向下拉
    if (diff > 0) {
      // 阻尼效果：超过阈值后阻力增大
      if (diff < REFRESH_THRESHOLD) {
        this.pullDistance = diff;
      } else {
        this.pullDistance = REFRESH_THRESHOLD + (diff - REFRESH_THRESHOLD) * 0.3;
      }

      // 限制最大距离
      this.pullDistance = Math.min(this.pullDistance, MAX_PULL_DISTANCE);

      // 检查是否达到刷新阈值
      if (this.pullDistance >= REFRESH_THRESHOLD) {
        this.setStatus(PULL_STATUS.READY);
      }

      return this.pullDistance;
    }
  }

  /**
   * 触摸结束
   */
  async onTouchEnd() {
    if (this.status === PULL_STATUS.READY) {
      // 执行刷新
      await this.doRefresh();
    } else {
      // 重置位置
      this.reset();
    }
  }

  /**
   * 执行刷新
   */
  async doRefresh() {
    this.setStatus(PULL_STATUS.REFRESHING);
    this.pullDistance = REFRESH_THRESHOLD;

    try {
      await this.onRefresh();
    } catch (error) {
      console.error('[PullRefresh] Refresh error:', error);
    } finally {
      // 刷新完成后重置
      this.reset();
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.pullDistance = 0;
    this.setStatus(PULL_STATUS.IDLE);
  }

  /**
   * 设置状态
   */
  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return this.status;
  }

  /**
   * 获取下拉距离
   */
  getPullDistance() {
    return this.pullDistance;
  }

  /**
   * 获取提示文字
   */
  getHintText() {
    switch (this.status) {
      case PULL_STATUS.PULLING:
        return '下拉刷新';
      case PULL_STATUS.READY:
        return '松开刷新';
      case PULL_STATUS.REFRESHING:
        return '加载中...';
      default:
        return '';
    }
  }

  /**
   * 获取箭头旋转角度
   */
  getArrowRotate() {
    return this.status === PULL_STATUS.READY ? 180 : 0;
  }
}

/**
 * 创建 PullRefresh 控制器
 * @param {Object} options - 配置选项
 * @returns {PullRefreshController}
 */
function createPullRefresh(options) {
  return new PullRefreshController(options);
}

module.exports = {
  PullRefreshController,
  createPullRefresh,
  PULL_STATUS,
  REFRESH_THRESHOLD,
  MAX_PULL_DISTANCE
};
