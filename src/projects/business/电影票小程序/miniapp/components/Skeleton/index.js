/**
 * Skeleton 骨架屏组件
 * 用于影院列表和订单页面的加载状态
 */

/**
 * 影院列表骨架屏数据结构
 */
function getCinemaSkeletonData(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    id: `skeleton-${index}`,
    isLoading: true
  }));
}

/**
 * 订单列表骨架屏数据结构
 */
function getOrderSkeletonData(count = 3) {
  return Array.from({ length: count }, (_, index) => ({
    id: `order-skeleton-${index}`,
    isLoading: true
  }));
}

/**
 * 骨架屏动画类名
 */
const SKELETON_ANIMATION_CLASS = 'skeleton-loading';

/**
 * 生成骨架屏样式对象
 * @param {number} width - 宽度百分比
 * @param {number} height - 高度 px
 * @param {string} shape - 形状：'rect' | 'round' | 'circle'
 * @returns {Object} 样式对象
 */
function getSkeletonStyle(width = 100, height = 20, shape = 'rect') {
  const borderRadius = shape === 'circle' ? '50%' : (shape === 'round' ? '4px' : '0');
  return {
    width: typeof width === 'number' ? `${width}%` : width,
    height: `${height}px`,
    borderRadius,
    class: SKELETON_ANIMATION_CLASS
  };
}

module.exports = {
  getCinemaSkeletonData,
  getOrderSkeletonData,
  getSkeletonStyle,
  SKELETON_ANIMATION_CLASS
};
