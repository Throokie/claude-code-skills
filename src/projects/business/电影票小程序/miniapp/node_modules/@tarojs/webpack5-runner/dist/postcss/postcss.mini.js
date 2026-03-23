"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostcssPlugins = exports.getDefaultPostcssConfig = void 0;
const node_path_1 = __importDefault(require("node:path"));
const helper_1 = require("@tarojs/helper");
const platform = process.env.TARO_ENV;
const defaultAutoprefixerOption = {
    enable: true,
    config: {
        flexbox: 'no-2009'
    }
};
const defaultPxtransformOption = {
    enable: true,
    config: {
        platform
    }
};
const defaultUrlOption = {
    enable: true,
    config: {
        url: 'inline'
    }
};
const defaultHtmltransformOption = {
    enable: false,
    config: {
        platform,
        removeCursorStyle: true
    }
};
const plugins = [];
const getDefaultPostcssConfig = function ({ designWidth, deviceRatio, postcssOption = {}, alias = {} }) {
    const { autoprefixer, pxtransform, htmltransform } = postcssOption, options = __rest(postcssOption, ["autoprefixer", "pxtransform", "htmltransform"]);
    if (designWidth) {
        defaultPxtransformOption.config.designWidth = designWidth;
    }
    if (deviceRatio) {
        defaultPxtransformOption.config.deviceRatio = deviceRatio;
    }
    const autoprefixerOption = (0, helper_1.recursiveMerge)({}, defaultAutoprefixerOption, autoprefixer);
    const pxtransformOption = (0, helper_1.recursiveMerge)({}, defaultPxtransformOption, pxtransform);
    const htmltransformOption = (0, helper_1.recursiveMerge)({}, defaultHtmltransformOption, htmltransform);
    return [
        ['postcss-import', {}, require('postcss-import')],
        ['autoprefixer', autoprefixerOption, require('autoprefixer')],
        ['postcss-pxtransform', pxtransformOption, require('postcss-pxtransform')],
        ['postcss-alias', { config: { alias } }, require('./postcss-alias').default],
        ['postcss-url', Object.assign(Object.assign({}, defaultUrlOption), ((options === null || options === void 0 ? void 0 : options.url) || {})), require('postcss-url')],
        ['postcss-html-transform', htmltransformOption, require('postcss-html-transform')],
        ...Object.entries(options)
    ];
};
exports.getDefaultPostcssConfig = getDefaultPostcssConfig;
const getPostcssPlugins = function (appPath, option = []) {
    option.forEach(([pluginName, pluginOption, pluginPkg]) => {
        if (!pluginOption || ['cssModules', 'url'].includes(pluginName))
            return;
        if (Object.hasOwnProperty.call(pluginOption, 'enable') && !pluginOption.enable)
            return;
        if (pluginPkg) {
            plugins.push(pluginPkg(pluginOption.config || {}));
            return;
        }
        if (!(0, helper_1.isNpmPkg)(pluginName)) {
            // local plugin
            pluginName = node_path_1.default.isAbsolute(pluginName) ? pluginName : node_path_1.default.join(appPath, pluginName);
        }
        try {
            const pluginPath = (0, helper_1.resolveSync)(pluginName, { basedir: appPath }) || '';
            plugins.push(require(pluginPath)(pluginOption.config || {}));
        }
        catch (e) {
            const msg = e.code === 'MODULE_NOT_FOUND' ? `缺少postcss插件${pluginName}, 已忽略` : e;
            console.log(msg);
        }
    });
    return plugins;
};
exports.getPostcssPlugins = getPostcssPlugins;
//# sourceMappingURL=postcss.mini.js.map