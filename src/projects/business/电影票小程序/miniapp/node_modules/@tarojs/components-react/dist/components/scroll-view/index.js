import './style/index.scss.js';
import { isFunction } from '@tarojs/shared';
import classNames from 'classnames';
import { throttle, createForwardRefComponent } from '../../utils/index.js';
import { useRef, useEffect } from '../../utils/hooks.react.js';
import { jsx } from 'react/jsx-runtime';

function easeOutScroll() {
  let from = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  let to = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let callback = arguments.length > 2 ? arguments[2] : undefined;
  if (from === to || typeof from !== 'number') {
    return;
  }
  const change = to - from;
  const dur = 500;
  const sTime = +new Date();
  function linear(t, b, c, d) {
    return c * t / d + b;
  }
  const isLarger = to >= from;
  function step() {
    from = linear(+new Date() - sTime, from, change, dur);
    if (isLarger && from >= to || !isLarger && to >= from) {
      callback(to);
      return;
    }
    callback(from);
    requestAnimationFrame(step);
  }
  step();
}
function scrollIntoView() {
  let id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  let isHorizontal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  let animated = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  let scrollIntoViewAlignment = arguments.length > 3 ? arguments[3] : undefined;
  var _a;
  (_a = document.querySelector(`#${id}`)) === null || _a === void 0 ? void 0 : _a.scrollIntoView({
    behavior: animated ? 'smooth' : 'auto',
    block: !isHorizontal ? scrollIntoViewAlignment || 'center' : 'center',
    inline: isHorizontal ? scrollIntoViewAlignment || 'start' : 'start'
  });
}
function scrollVertical(container, scrollTop, top, isAnimation) {
  if (isAnimation) {
    easeOutScroll(scrollTop.current, top, pos => {
      if (container.current) container.current.scrollTop = pos;
    });
  } else {
    if (container.current) container.current.scrollTop = top;
  }
  scrollTop.current = top;
}
function scrollHorizontal(container, scrollLeft, left, isAnimation) {
  if (isAnimation) {
    easeOutScroll(scrollLeft.current, left, pos => {
      if (container.current) container.current.scrollLeft = pos;
    });
  } else {
    if (container.current) container.current.scrollLeft = left;
  }
  scrollLeft.current = left;
}
function ScrollView(props) {
  const _scrollTop = useRef(null);
  const _scrollLeft = useRef(null);
  const container = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const onTouchMove = e => {
    e.stopPropagation();
  };
  const handleScroll = function (props) {
    let isInit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    // scrollIntoView
    if (props.scrollIntoView && typeof props.scrollIntoView === 'string' && document && document.querySelector && document.querySelector(`#${props.scrollIntoView}`)) {
      const isHorizontal = props.scrollX && !props.scrollY;
      if (isInit) {
        setTimeout(() => scrollIntoView(props.scrollIntoView, props.scrollWithAnimation, isHorizontal, props.scrollIntoViewAlignment), 500);
      } else {
        scrollIntoView(props.scrollIntoView, props.scrollWithAnimation, isHorizontal, props.scrollIntoViewAlignment);
      }
    } else {
      const isAnimation = !!props.scrollWithAnimation;
      // Y 轴滚动
      if (props.scrollY && typeof props.scrollTop === 'number' && props.scrollTop !== _scrollTop.current) {
        setTimeout(() => scrollVertical(container, _scrollTop, props.scrollTop, isAnimation), 10);
      }
      // X 轴滚动
      if (props.scrollX && typeof props.scrollLeft === 'number' && props.scrollLeft !== _scrollLeft.current) {
        setTimeout(() => scrollHorizontal(container, _scrollLeft, props.scrollLeft, isAnimation), 10);
      }
    }
  };
  useEffect(() => {
    handleScroll(props, true);
    isInitializedRef.current = true;
  }, []);
  // 监听 scrollTop、scrollLeft、scrollIntoView 的变化（排除初始化）
  useEffect(() => {
    if (isInitializedRef.current && container.current) {
      handleScroll(props, false);
    }
  }, [props.scrollTop, props.scrollLeft, props.scrollIntoView]);
  const {
    className,
    style = {},
    onScroll,
    onScrollToUpper,
    onScrollToLower,
    scrollX,
    scrollY,
    showScrollbar = true,
    // 默认显示滚动条
    enhanced = false // 默认不增强
  } = props;
  let {
    upperThreshold = 50,
    lowerThreshold = 50
  } = props;
  const cls = classNames('taro-scroll', {
    'taro-scroll-view__scroll-x': scrollX,
    'taro-scroll-view__scroll-y': scrollY,
    'taro-scroll--hidebar': enhanced === true && showScrollbar === false,
    'taro-scroll--enhanced': enhanced === true
  }, className);
  upperThreshold = Number(upperThreshold);
  lowerThreshold = Number(lowerThreshold);
  const upperAndLower = e => {
    if (!container.current) return;
    const {
      offsetWidth,
      offsetHeight,
      scrollLeft,
      scrollTop,
      scrollHeight,
      scrollWidth
    } = container.current;
    if (onScrollToLower && (props.scrollY && offsetHeight + scrollTop + lowerThreshold >= scrollHeight || props.scrollX && offsetWidth + scrollLeft + lowerThreshold >= scrollWidth)) {
      onScrollToLower(e);
    }
    if (onScrollToUpper && (props.scrollY && scrollTop <= upperThreshold || props.scrollX && scrollLeft <= upperThreshold)) {
      onScrollToUpper(e);
    }
  };
  const upperAndLowerThrottle = throttle(upperAndLower, 200);
  const _onScroll = e => {
    const {
      scrollLeft,
      scrollTop,
      scrollHeight,
      scrollWidth
    } = container.current;
    _scrollLeft.current = scrollLeft;
    _scrollTop.current = scrollTop;
    Object.defineProperty(e, 'detail', {
      enumerable: true,
      writable: true,
      value: {
        scrollLeft,
        scrollTop,
        scrollHeight,
        scrollWidth
      }
    });
    // 处理滚动开始
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      if (props.onScrollStart) {
        props.onScrollStart(e);
      }
    }
    // 清除滚动结束定时器
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
    // 设置滚动结束定时器（150ms 无滚动事件后触发）
    if (props.onScrollEnd) {
      scrollEndTimerRef.current = setTimeout(() => {
        var _a;
        if (isScrollingRef.current) {
          isScrollingRef.current = false;
          (_a = props.onScrollEnd) === null || _a === void 0 ? void 0 : _a.call(props, e);
        }
        scrollEndTimerRef.current = null;
      }, 150);
    }
    upperAndLowerThrottle(e);
    onScroll && onScroll(e);
  };
  const _onTouchMove = e => {
    isFunction(props.onTouchMove) ? props.onTouchMove(e) : onTouchMove(e);
  };
  const _onTouchStart = e => {
    if (isFunction(props.onTouchStart)) {
      props.onTouchStart(e);
    }
  };
  const _onTouchEnd = e => {
    if (isFunction(props.onTouchEnd)) {
      props.onTouchEnd(e);
    }
  };
  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }
    };
  }, []);
  return /*#__PURE__*/jsx("div", {
    ref: e => {
      if (e) {
        container.current = e;
        if (props.forwardedRef) props.forwardedRef.current = e;
      }
    },
    style: style,
    className: cls,
    onScroll: _onScroll,
    onTouchMove: _onTouchMove,
    onTouchStart: _onTouchStart,
    onTouchEnd: _onTouchEnd,
    children: props.children
  });
}
var index = createForwardRefComponent(ScrollView);

export { index as default };
//# sourceMappingURL=index.js.map
