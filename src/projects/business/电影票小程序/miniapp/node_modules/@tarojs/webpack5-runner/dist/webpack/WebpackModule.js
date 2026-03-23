"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebpackModule = void 0;
const node_path_1 = __importDefault(require("node:path"));
const helper_1 = require("@tarojs/helper");
const runner_utils_1 = require("@tarojs/runner-utils");
const shared_1 = require("@tarojs/shared");
const webpack_1 = require("../utils/webpack");
class WebpackModule {
    static getLoader(loaderName, options = {}) {
        return {
            loader: require.resolve(loaderName),
            options
        };
    }
    static getCSSLoader(cssLoaderOption) {
        const defaultOptions = {
            importLoaders: 1,
            modules: false
        };
        const options = Object.assign(defaultOptions, cssLoaderOption);
        return WebpackModule.getLoader('css-loader', options);
    }
    static getCSSLoaderWithModule(cssModuleOptions, cssLoaderOption) {
        const { namingPattern, generateScopedName } = cssModuleOptions;
        const defaultOptions = Object.assign({
            importLoaders: 1,
            modules: {
                mode: namingPattern === 'module' ? 'local' : 'global',
                namedExport: false,
                exportLocalsConvention: 'as-is',
            }
        }, {
            modules: (0, shared_1.isFunction)(generateScopedName)
                ? { getLocalIdent: (context, _, localName) => generateScopedName(localName, context.resourcePath) }
                : { localIdentName: generateScopedName }
        });
        // 更改 namedExport 默认值，以统一旧版本行为
        // https://github.com/webpack-contrib/css-loader/releases/tag/v7.0.0
        defaultOptions.modules.namedExport = false;
        defaultOptions.modules.exportLocalsConvention = 'as-is';
        const options = (0, helper_1.recursiveMerge)({}, defaultOptions, cssLoaderOption);
        return WebpackModule.getLoader('css-loader', options);
    }
    static getExtractCSSLoader() {
        const MiniCssExtractPlugin = require('mini-css-extract-plugin');
        return {
            loader: MiniCssExtractPlugin.loader
        };
    }
    static getStyleLoader(options) {
        return WebpackModule.getLoader('style-loader', options);
    }
    static getPostCSSLoader(options) {
        return WebpackModule.getLoader('postcss-loader', options);
    }
    static getBaseSassOptions() {
        return {
            sourceMap: true,
            implementation: require('sass'),
            sassOptions: {
                outputStyle: 'expanded',
                // https://github.com/sass/dart-sass/blob/main/CHANGELOG.md#js-api
                silenceDeprecations: ['legacy-js-api'],
                importer(url, prev, done) {
                    // 让 sass 文件里的 @import 能解析小程序原生样式文体，如 @import "a.wxss";
                    const extname = node_path_1.default.extname(url);
                    // fix: @import 文件可以不带scss/sass缀，如: @import "define";
                    if (extname === '.scss' || extname === '.sass' || extname === '.css' || !extname) {
                        return null;
                    }
                    else {
                        const filePath = node_path_1.default.resolve(node_path_1.default.dirname(prev), url);
                        helper_1.fs.access(filePath, helper_1.fs.constants.F_OK, (err) => {
                            if (err) {
                                console.log(err);
                                return null;
                            }
                            else {
                                helper_1.fs.readFile(filePath)
                                    .then(res => {
                                    done({ contents: res.toString() });
                                })
                                    .catch(err => {
                                    console.log(err);
                                    return null;
                                });
                            }
                        });
                    }
                }
            }
        };
    }
    static getSassLoader(sassLoaderOption) {
        const options = (0, helper_1.recursiveMerge)({}, WebpackModule.getBaseSassOptions(), {
            sassOptions: {
                indentedSyntax: true
            }
        }, sassLoaderOption);
        return WebpackModule.getLoader('sass-loader', options);
    }
    static getScssLoader(sassLoaderOption) {
        const options = (0, helper_1.recursiveMerge)({}, WebpackModule.getBaseSassOptions(), sassLoaderOption);
        return WebpackModule.getLoader('sass-loader', options);
    }
    static getLessLoader(options) {
        return WebpackModule.getLoader('less-loader', options);
    }
    static getStylusLoader(options) {
        return WebpackModule.getLoader('stylus-loader', options);
    }
    static getResolveUrlLoader(options = {}) {
        return WebpackModule.getLoader('resolve-url-loader', options);
    }
    static getScriptRule() {
        return {
            test: helper_1.REG_SCRIPTS,
            use: {
                babelLoader: WebpackModule.getLoader('babel-loader', {
                    compact: false
                })
            }
        };
    }
    static getMediaRule(sourceRoot, options) {
        const maxSize = (0, webpack_1.getAssetsMaxSize)(options, runner_utils_1.MEDIA_LIMIT);
        return {
            test: helper_1.REG_MEDIA,
            type: 'asset',
            parser: {
                dataUrlCondition: {
                    maxSize,
                }
            },
            generator: {
                emit: options.emitFile || options.emit,
                outputPath: options.outputPath,
                publicPath: options.publicPath,
                filename({ filename }) {
                    if ((0, shared_1.isFunction)(options.name))
                        return options.name(filename);
                    return options.name || filename.replace(sourceRoot + '/', '');
                }
            }
        };
    }
    static getFontRule(sourceRoot, options) {
        const maxSize = (0, webpack_1.getAssetsMaxSize)(options, runner_utils_1.FONT_LIMIT);
        return {
            test: helper_1.REG_FONT,
            type: 'asset',
            parser: {
                dataUrlCondition: {
                    maxSize,
                }
            },
            generator: {
                emit: options.emitFile || options.emit,
                outputPath: options.outputPath,
                publicPath: options.publicPath,
                filename({ filename }) {
                    if ((0, shared_1.isFunction)(options.name))
                        return options.name(filename);
                    return options.name || filename.replace(sourceRoot + '/', '');
                }
            }
        };
    }
    static getImageRule(sourceRoot, options) {
        const maxSize = (0, webpack_1.getAssetsMaxSize)(options, runner_utils_1.IMAGE_LIMIT);
        return {
            test: helper_1.REG_IMAGE,
            type: 'asset',
            parser: {
                dataUrlCondition: {
                    maxSize,
                }
            },
            generator: {
                emit: options.emitFile || options.emit,
                outputPath: options.outputPath,
                publicPath: options.publicPath,
                filename({ filename }) {
                    if ((0, shared_1.isFunction)(options.name))
                        return options.name(filename);
                    return options.name || filename.replace(sourceRoot + '/', '');
                }
            }
        };
    }
}
exports.WebpackModule = WebpackModule;
//# sourceMappingURL=WebpackModule.js.map