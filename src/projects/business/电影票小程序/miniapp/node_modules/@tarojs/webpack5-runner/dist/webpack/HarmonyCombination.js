"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyCombination = void 0;
const helper_1 = require("@tarojs/helper");
const Combination_1 = require("./Combination");
const HarmonyBaseConfig_1 = require("./HarmonyBaseConfig");
const HarmonyWebpackModule_1 = require("./HarmonyWebpackModule");
const HarmonyWebpackPlugin_1 = require("./HarmonyWebpackPlugin");
class HarmonyCombination extends Combination_1.Combination {
    process(config) {
        const baseConfig = new HarmonyBaseConfig_1.HarmonyBaseConfig(this.appPath, config);
        const chain = this.chain = baseConfig.chain;
        const { entry = {}, output = {}, mode = 'production', sourceMapType = 'cheap-module-source-map', fileType = {
            style: '.css',
            config: '.json',
            script: '.js',
            templ: '.hml'
        }, } = config;
        this.fileType = fileType;
        const webpackEntry = this.getEntry(entry);
        const webpackOutput = this.getOutput({
            publicPath: '/',
            output
        });
        const webpackPlugin = new HarmonyWebpackPlugin_1.HarmonyWebpackPlugin(this);
        const webpackModule = new HarmonyWebpackModule_1.HarmonyWebpackModule(this);
        const module = webpackModule.getModules();
        const [, pxtransformOption] = webpackModule.__postcssOption.find(([name]) => name === 'postcss-pxtransform') || [];
        webpackPlugin.pxtransformOption = pxtransformOption;
        const plugin = webpackPlugin.getPlugins();
        chain.merge({
            entry: webpackEntry,
            output: webpackOutput,
            mode,
            devtool: this.getDevtool(sourceMapType),
            resolve: {
                alias: this.getAlias()
            },
            plugin,
            module,
            optimization: this.getOptimization()
        });
    }
    getEntry(entry) {
        return entry;
    }
    getOutput({ publicPath, output }) {
        return Object.assign({ path: this.outputDir, publicPath, filename: '[name].js', chunkFilename: '[name].js', enabledLibraryTypes: [] }, output);
    }
    getAlias() {
        const { alias = {} } = this.config;
        return Object.assign({}, alias);
    }
    getOptimization() {
        return {
            usedExports: true,
            runtimeChunk: {
                name: 'runtime'
            },
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: Infinity,
                minSize: 0,
                cacheGroups: {
                    default: false,
                    defaultVendors: false,
                    common: {
                        name: 'common',
                        minChunks: 2,
                        priority: 1
                    },
                    vendors: {
                        name: 'vendors',
                        minChunks: 2,
                        test: module => {
                            const nodeModulesDirRegx = new RegExp(helper_1.REG_NODE_MODULES_DIR);
                            return nodeModulesDirRegx.test(module.resource);
                        },
                        priority: 10
                    },
                    taro: {
                        name: 'taro',
                        test: module => helper_1.REG_TARO_SCOPED_PACKAGE.test(module.context),
                        priority: 100
                    }
                }
            }
        };
    }
}
exports.HarmonyCombination = HarmonyCombination;
//# sourceMappingURL=HarmonyCombination.js.map