"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyWebpackPlugin = void 0;
const helper_1 = require("@tarojs/helper");
const shared_1 = require("@tarojs/shared");
const HarmonyPlugin_1 = __importDefault(require("../plugins/HarmonyPlugin"));
const WebpackPlugin_1 = __importDefault(require("./WebpackPlugin"));
class HarmonyWebpackPlugin {
    constructor(combination) {
        this.combination = combination;
    }
    getPlugins() {
        const plugins = {
            providerPlugin: this.getProviderPlugin(),
            definePlugin: this.getDefinePlugin(),
        };
        const copyWebpackPlugin = this.getCopyWebpackPlugin();
        if (copyWebpackPlugin)
            plugins.copyWebpackPlugin = copyWebpackPlugin;
        const definePluginOptions = plugins.definePlugin.args[0];
        plugins.mainPlugin = this.getMainPlugin(definePluginOptions);
        return plugins;
    }
    getProviderPlugin() {
        return WebpackPlugin_1.default.getProviderPlugin({
            window: ['@tarojs/runtime', 'window'],
            document: ['@tarojs/runtime', 'document'],
            navigator: ['@tarojs/runtime', 'navigator'],
            requestAnimationFrame: ['@tarojs/runtime', 'requestAnimationFrame'],
            cancelAnimationFrame: ['@tarojs/runtime', 'cancelAnimationFrame'],
            Element: ['@tarojs/runtime', 'TaroElement'],
            SVGElement: ['@tarojs/runtime', 'SVGElement'],
            MutationObserver: ['@tarojs/runtime', 'MutationObserver'],
            history: ['@tarojs/runtime', 'history'],
            location: ['@tarojs/runtime', 'location'],
            URLSearchParams: ['@tarojs/runtime', 'URLSearchParams'],
            URL: ['@tarojs/runtime', 'URL'],
        });
    }
    getDefinePlugin() {
        const { env = {}, defineConstants = {}, framework = 'react', buildAdapter = helper_1.PLATFORMS.WEAPP } = this.combination.config;
        env.FRAMEWORK = JSON.stringify(framework);
        env.TARO_ENV = JSON.stringify(buildAdapter);
        env.TARO_PLATFORM = JSON.stringify(process.env.TARO_PLATFORM || shared_1.PLATFORM_TYPE.HARMONY);
        const envConstants = Object.keys(env).reduce((target, key) => {
            target[`process.env.${key}`] = env[key];
            return target;
        }, {});
        return WebpackPlugin_1.default.getDefinePlugin([envConstants, defineConstants]);
    }
    getCopyWebpackPlugin() {
        var _a;
        const combination = this.combination;
        const { appPath, config } = combination;
        let copyWebpackPlugin;
        if ((_a = config.copy) === null || _a === void 0 ? void 0 : _a.patterns.length) {
            copyWebpackPlugin = WebpackPlugin_1.default.getCopyWebpackPlugin(appPath, config.copy);
        }
        return copyWebpackPlugin;
    }
    getMainPlugin(definePluginOptions) {
        var _a;
        const { combination } = this;
        const options = {
            commonChunks: this.getCommonChunks(),
            constantsReplaceList: definePluginOptions,
            pxTransformConfig: ((_a = this.pxtransformOption) === null || _a === void 0 ? void 0 : _a.config) || {},
            hot: false,
            combination,
        };
        return WebpackPlugin_1.default.getPlugin(HarmonyPlugin_1.default, [options]);
    }
    getCommonChunks() {
        const { config } = this.combination;
        const { commonChunks } = config;
        const defaultCommonChunks = ['runtime', 'vendors', 'taro', 'common'];
        let customCommonChunks = defaultCommonChunks;
        if ((0, shared_1.isFunction)(commonChunks)) {
            customCommonChunks = commonChunks(defaultCommonChunks.concat()) || defaultCommonChunks;
        }
        else if ((0, shared_1.isArray)(commonChunks) && commonChunks.length) {
            customCommonChunks = commonChunks;
        }
        return customCommonChunks;
    }
}
exports.HarmonyWebpackPlugin = HarmonyWebpackPlugin;
//# sourceMappingURL=HarmonyWebpackPlugin.js.map