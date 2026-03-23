"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("node:path");
const entry_cache_1 = require("./entry-cache");
const util_1 = require("./util");
function default_1(source, map) {
    var _a;
    const options = this.getOptions();
    const stringify = (s) => (0, util_1.stringifyRequest)(this, s);
    const pageName = options.name;
    const { isNeedRawLoader } = options.loaderMeta;
    // raw is a placeholder loader to locate changed .vue resource
    const raw = path.join(__dirname, 'raw.js');
    const entryCacheLoader = path.join(__dirname, 'entry-cache.js') + `?name=${pageName}`;
    entry_cache_1.entryCache.set(pageName, {
        source,
        map
    });
    const componentPath = isNeedRawLoader
        ? ['!', raw, entryCacheLoader, this.resourcePath].join('!')
        : ['!', entryCacheLoader, this.resourcePath].join('!');
    const { globalObject } = ((_a = this._compilation) === null || _a === void 0 ? void 0 : _a.outputOptions) || { globalObject: 'wx' };
    const prerender = `
if (typeof PRERENDER !== 'undefined') {
  ${globalObject}._prerender = inst
}`;
    return `import { createComponentConfig } from '@tarojs/runtime'
import component from ${stringify(componentPath)}
var inst = Component(createComponentConfig(component, '${pageName}'))
${options.prerender ? prerender : ''}
export default component
`;
}
exports.default = default_1;
//# sourceMappingURL=component.js.map