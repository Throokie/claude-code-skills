"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyWebpackModule = void 0;
const helper_1 = require("@tarojs/helper");
const lodash_1 = require("lodash");
const postcss_harmony_1 = require("../postcss/postcss.harmony");
const WebpackModule_1 = require("./WebpackModule");
class HarmonyWebpackModule {
    constructor(combination) {
        this.combination = combination;
    }
    getModules() {
        const { appPath, config } = this.combination;
        const { sassLoaderOption, lessLoaderOption, stylusLoaderOption, designWidth, deviceRatio } = config;
        const { postcssOption, cssModuleOption } = this.parsePostCSSOptions();
        this.__postcssOption = (0, postcss_harmony_1.getDefaultPostcssConfig)({
            designWidth,
            deviceRatio,
            postcssOption,
            alias: config.alias,
        });
        const postcssPlugins = (0, postcss_harmony_1.getPostcssPlugins)(appPath, this.__postcssOption);
        const cssLoaders = this.getCSSLoaders(postcssPlugins, cssModuleOption);
        const resolveUrlLoader = WebpackModule_1.WebpackModule.getResolveUrlLoader();
        const sassLoader = WebpackModule_1.WebpackModule.getSassLoader(sassLoaderOption);
        const scssLoader = WebpackModule_1.WebpackModule.getScssLoader(sassLoaderOption);
        const lessLoader = WebpackModule_1.WebpackModule.getLessLoader(lessLoaderOption);
        const stylusLoader = WebpackModule_1.WebpackModule.getStylusLoader(stylusLoaderOption);
        const rule = {
            sass: {
                test: helper_1.REG_SASS_SASS,
                oneOf: this.addCSSLoader(cssLoaders, resolveUrlLoader, sassLoader)
            },
            scss: {
                test: helper_1.REG_SASS_SCSS,
                oneOf: this.addCSSLoader(cssLoaders, resolveUrlLoader, scssLoader)
            },
            less: {
                test: helper_1.REG_LESS,
                oneOf: this.addCSSLoader(cssLoaders, lessLoader)
            },
            stylus: {
                test: helper_1.REG_STYLUS,
                oneOf: this.addCSSLoader(cssLoaders, stylusLoader)
            },
            normalCss: {
                test: helper_1.REG_CSS,
                oneOf: cssLoaders
            },
            script: this.getScriptRule(),
            media: this.getMediaRule(),
            font: this.getFontRule(),
            image: this.getImageRule()
        };
        return { rule };
    }
    addCSSLoader(cssLoaders, ...loader) {
        const cssLoadersCopy = (0, lodash_1.cloneDeep)(cssLoaders);
        cssLoadersCopy.forEach(item => {
            if (item.use) {
                item.use = [...item.use, ...loader];
            }
        });
        return cssLoadersCopy;
    }
    getCSSLoaders(postcssPlugins, cssModuleOption) {
        const { config } = this.combination;
        const { cssLoaderOption } = config;
        const extractCSSLoader = WebpackModule_1.WebpackModule.getExtractCSSLoader();
        const cssLoader = WebpackModule_1.WebpackModule.getCSSLoader(cssLoaderOption);
        const postCSSLoader = WebpackModule_1.WebpackModule.getPostCSSLoader({
            postcssOptions: {
                plugins: postcssPlugins
            }
        });
        const cssLoaders = [{
                use: [
                    extractCSSLoader,
                    cssLoader,
                    postCSSLoader
                ]
            }];
        if (cssModuleOption.enable) {
            const cssModuleOptionConfig = (0, helper_1.recursiveMerge)({}, {
                namingPattern: 'module',
                generateScopedName: '[name]__[local]___[hash:base64:5]'
            }, cssModuleOption.config);
            const cssLoaderWithModule = WebpackModule_1.WebpackModule.getCSSLoaderWithModule(cssModuleOptionConfig, cssLoaderOption);
            const styleModuleReg = /(.*\.module).*\.(css|s[ac]ss|less|styl)\b/;
            const styleGlobalReg = /(.*\.global).*\.(css|s[ac]ss|less|styl)\b/;
            let cssModuleCondition;
            if (cssModuleOptionConfig.namingPattern === 'module') {
                /* 不排除 node_modules 内的样式 */
                cssModuleCondition = styleModuleReg;
                // for vue
                cssLoaders.unshift({
                    resourceQuery: /module=/,
                    use: [
                        extractCSSLoader,
                        cssLoaderWithModule,
                        postCSSLoader
                    ]
                });
            }
            else {
                cssModuleCondition = {
                    and: [
                        { not: styleGlobalReg },
                        { not: helper_1.isNodeModule }
                    ]
                };
            }
            cssLoaders.unshift({
                include: [cssModuleCondition],
                use: [
                    extractCSSLoader,
                    cssLoaderWithModule,
                    postCSSLoader
                ]
            });
        }
        return cssLoaders;
    }
    getScriptRule() {
        const { sourceDir } = this.combination;
        const { compile = {} } = this.combination.config;
        const rule = WebpackModule_1.WebpackModule.getScriptRule();
        rule.include = [
            sourceDir,
            filename => /(?<=node_modules[\\/]).*taro/.test(filename)
        ];
        if (Array.isArray(compile.include)) {
            rule.include.unshift(...compile.include);
        }
        if (Array.isArray(compile.exclude)) {
            rule.exclude = [...compile.exclude];
        }
        return rule;
    }
    parsePostCSSOptions() {
        const { postcss: postcssOption = {} } = this.combination.config;
        const defaultCssModuleOption = {
            enable: false,
            config: {
                namingPattern: 'global',
                generateScopedName: '[name]__[local]___[hash:base64:5]'
            }
        };
        const cssModuleOption = (0, helper_1.recursiveMerge)({}, defaultCssModuleOption, postcssOption.cssModules);
        return {
            postcssOption,
            cssModuleOption
        };
    }
    getMediaRule() {
        const sourceRoot = this.combination.sourceRoot;
        const { mediaUrlLoaderOption = {} } = this.combination.config;
        return WebpackModule_1.WebpackModule.getMediaRule(sourceRoot, mediaUrlLoaderOption);
    }
    getFontRule() {
        const sourceRoot = this.combination.sourceRoot;
        const { fontUrlLoaderOption = {} } = this.combination.config;
        return WebpackModule_1.WebpackModule.getFontRule(sourceRoot, fontUrlLoaderOption);
    }
    getImageRule() {
        const sourceRoot = this.combination.sourceRoot;
        const { imageUrlLoaderOption = {} } = this.combination.config;
        return WebpackModule_1.WebpackModule.getImageRule(sourceRoot, imageUrlLoaderOption);
    }
}
exports.HarmonyWebpackModule = HarmonyWebpackModule;
//# sourceMappingURL=HarmonyWebpackModule.js.map