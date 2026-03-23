"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("node:path");
const constants_1 = require("./constants");
const entry_cache_1 = require("./entry-cache");
const util_1 = require("./util");
function default_1(source, map) {
    var _a;
    const stringify = (s) => (0, util_1.stringifyRequest)(this, s);
    const options = this.getOptions();
    const { importFrameworkStatement, frameworkArgs, creator, creatorLocation, modifyInstantiate } = options.loaderMeta;
    const config = JSON.stringify(options.config);
    const blended = options.blended;
    const newBlended = options.newBlended;
    const pxTransformConfig = options.pxTransformConfig;
    const { globalObject } = ((_a = this._compilation) === null || _a === void 0 ? void 0 : _a.outputOptions) || { globalObject: 'wx' };
    const entryCacheLoader = path.join(__dirname, 'entry-cache.js') + '?name=app';
    entry_cache_1.entryCache.set('app', {
        source,
        map
    });
    const prerender = `
if (typeof PRERENDER !== 'undefined') {
  ${globalObject}._prerender = inst
}`;
    const runtimePath = Array.isArray(options.runtimePath) ? options.runtimePath : [options.runtimePath];
    let setReconcilerPost = '';
    const setReconciler = runtimePath.reduce((res, item) => {
        if (constants_1.REG_POST.test(item)) {
            setReconcilerPost += `import '${item.replace(constants_1.REG_POST, '')}'\n`;
            return res;
        }
        else {
            return res + `import '${item}'\n`;
        }
    }, '');
    const createApp = `${creator}(component, ${frameworkArgs})`;
    let instantiateApp = blended || newBlended
        ? `
var app = ${createApp}
app.onLaunch()
exports.taroApp = app
`
        : `var inst = App(${createApp})`;
    if (typeof modifyInstantiate === 'function') {
        instantiateApp = modifyInstantiate(instantiateApp, 'app');
    }
    return `${setReconciler}
import { window } from '@tarojs/runtime'
import { ${creator} } from '${creatorLocation}'
import { initPxTransform } from '@tarojs/taro'
${setReconcilerPost}
import component from ${stringify(['!', entryCacheLoader, this.resourcePath].join('!'))}
${importFrameworkStatement}
var config = ${config};
window.__taroAppConfig = config
${instantiateApp}
${options.prerender ? prerender : ''}
initPxTransform({
  designWidth: ${pxTransformConfig.designWidth},
  deviceRatio: ${JSON.stringify(pxTransformConfig.deviceRatio)},
  baseFontSize: ${pxTransformConfig.baseFontSize || 20},
  unitPrecision: ${pxTransformConfig.unitPrecision},
  targetUnit: ${JSON.stringify(pxTransformConfig.targetUnit)}
})
`;
}
exports.default = default_1;
//# sourceMappingURL=app.js.map