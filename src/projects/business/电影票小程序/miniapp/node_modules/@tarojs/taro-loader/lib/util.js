"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyRequest = exports.getPkgVersion = exports.getRootPath = void 0;
const path = require("node:path");
const helper_1 = require("@tarojs/helper");
function getRootPath() {
    return path.resolve(__dirname, '../');
}
exports.getRootPath = getRootPath;
function getPkgVersion() {
    const pkgPath = path.join(getRootPath(), 'package.json');
    if (helper_1.fs.existsSync(pkgPath)) {
        return require(pkgPath).version;
    }
    return 'unknown';
}
exports.getPkgVersion = getPkgVersion;
function stringifyRequest(loaderContext, request) {
    return JSON.stringify(loaderContext.utils.contextify(loaderContext.context || loaderContext.rootContext, request));
}
exports.stringifyRequest = stringifyRequest;
//# sourceMappingURL=util.js.map