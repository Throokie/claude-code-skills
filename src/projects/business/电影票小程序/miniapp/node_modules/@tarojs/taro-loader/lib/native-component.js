"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("node:path");
const entry_cache_1 = require("./entry-cache");
const page_1 = require("./page");
const util_1 = require("./util");
function default_1(source, map) {
    var _a;
    const options = this.getOptions();
    const { loaderMeta = {}, config: loaderConfig, isNewBlended = false, runtimePath } = options;
    const { importFrameworkStatement, frameworkArgs, isNeedRawLoader, creatorLocation } = loaderMeta;
    const config = (0, page_1.getPageConfig)(loaderConfig, this.resourcePath);
    config.isNewBlended = isNewBlended;
    const configString = JSON.stringify(config);
    const stringify = (s) => (0, util_1.stringifyRequest)(this, s);
    const pageName = options.name;
    const behaviorsName = options.behaviorsName;
    // raw is a placeholder loader to locate changed .vue resource
    const entryCacheLoader = path.join(__dirname, 'entry-cache.js') + `?name=${pageName}`;
    entry_cache_1.entryCache.set(pageName, {
        source,
        map
    });
    const raw = path.join(__dirname, 'raw.js');
    const componentPath = isNeedRawLoader
        ? ['!', raw, entryCacheLoader, this.resourcePath].join('!')
        : ['!', entryCacheLoader, this.resourcePath].join('!');
    const processedRuntimePath = Array.isArray(runtimePath) ? runtimePath : [runtimePath];
    const setReconciler = processedRuntimePath.reduce((res, item) => {
        if (/^@tarojs\/plugin-(react|vue)-devtools/.test(item))
            return res;
        return res + `import '${item}'\n`;
    }, '');
    const { globalObject } = ((_a = this._compilation) === null || _a === void 0 ? void 0 : _a.outputOptions) || { globalObject: 'wx' };
    const prerender = `
if (typeof PRERENDER !== 'undefined') {
  ${globalObject}._prerender = inst
}`;
    return `${setReconciler}
import { createNativeComponentConfig } from '${creatorLocation}'
${importFrameworkStatement}
var component = require(${stringify(componentPath)}).default
var config = ${configString};
var taroOption = createNativeComponentConfig(component, ${frameworkArgs})
if (component && component.behaviors) {
  taroOption.${behaviorsName} = (taroOption.${behaviorsName} || []).concat(component.behaviors)
}
var inst = Component(taroOption)
${options.prerender ? prerender : ''}
export default component
`;
}
exports.default = default_1;
//# sourceMappingURL=native-component.js.map