"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entryCache = void 0;
exports.entryCache = new Map();
function default_1() {
    const callback = this.async();
    const { name } = this.getOptions();
    if (name && exports.entryCache.has(name)) {
        const content = exports.entryCache.get(name);
        // just in case, delete cache in next tick
        setImmediate(() => exports.entryCache.delete(name));
        callback(null, content.source, content.map);
    }
}
exports.default = default_1;
//# sourceMappingURL=entry-cache.js.map