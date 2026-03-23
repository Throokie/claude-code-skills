"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniBaseConfig = void 0;
const helper_1 = require("@tarojs/helper");
const BaseConfig_1 = require("./BaseConfig");
class MiniBaseConfig extends BaseConfig_1.BaseConfig {
    constructor(appPath, config) {
        super(appPath, config);
        this.defaultTerserOptions = {
            parse: {
                ecma: 8,
            },
            compress: {
                ecma: 5,
                warnings: false,
                arrows: false,
                collapse_vars: false,
                comparisons: false,
                computed_props: false,
                hoist_funs: false,
                hoist_props: false,
                hoist_vars: false,
                inline: false,
                loops: false,
                negate_iife: false,
                properties: false,
                reduce_funcs: false,
                reduce_vars: false,
                switches: false,
                toplevel: false,
                typeofs: false,
                booleans: true,
                if_return: true,
                sequences: true,
                unused: true,
                conditionals: true,
                dead_code: true,
                directives: false,
                evaluate: true,
            },
            output: {
                ecma: 5,
                comments: false,
                ascii_only: true,
            },
        };
        const mainFields = [...helper_1.defaultMainFields];
        const resolveOptions = {
            basedir: appPath,
            mainFields,
        };
        this.chain.merge({
            resolve: {
                mainFields,
                alias: {
                    // 小程序使用 regenerator-runtime@0.11
                    'regenerator-runtime': require.resolve('regenerator-runtime'),
                    // 开发组件库时 link 到本地调试，runtime 包需要指向本地 node_modules 顶层的 runtime，保证闭包值 Current 一致，shared 也一样
                    '@tarojs/runtime': (0, helper_1.resolveSync)('@tarojs/runtime', resolveOptions),
                    '@tarojs/shared': (0, helper_1.resolveSync)('@tarojs/shared', resolveOptions),
                },
                // [Webpack 4] config.node: { fs: false, path: false }
                // [Webpack 5] config.resolve.fallback
                fallback: {
                    fs: false,
                    path: false,
                },
            },
            optimization: {
                sideEffects: true,
            },
            performance: {
                maxEntrypointSize: 2 * 1000 * 1000,
            },
        });
        this.setMinimizer(config, this.defaultTerserOptions);
    }
}
exports.MiniBaseConfig = MiniBaseConfig;
//# sourceMappingURL=MiniBaseConfig.js.map