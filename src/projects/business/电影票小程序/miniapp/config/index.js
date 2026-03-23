const config = {
  projectName: "ticket-miniapp",
  date: "2026-3-6",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: "src",
  outputRoot: "dist",
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  framework: "react",
  compiler: {
    type: "webpack5",
    prebundle: { enable: false }
  },
  cache: {
    enable: false
  },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} }
    }
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    postcss: {
      pxtransform: { enable: true, config: {} }
    },
    devServer: {
      port: 10086,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8021",
          changeOrigin: true
        }
      }
    },
    webpackChain(chain) {
      // 解决 Node.js v24 兼容性问题
      chain.resolve.fallback.merge({
        crypto: false,
        stream: false,
        buffer: false
      });
    }
  }
};

module.exports = function (merge) {
  if (process.env.NODE_ENV === "development") {
    return merge({}, config, require("./dev"));
  }
  return merge({}, config, require("./prod"));
};