"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(source) {
    const options = this.getOptions();
    const runtimePath = Array.isArray(options.runtimePath) ? options.runtimePath : [options.runtimePath];
    const setReconciler = runtimePath.reduce((res, item) => {
        return res + `import '${item}'\n`;
    }, '');
    return `${setReconciler}
  ${source}`;
}
exports.default = default_1;
//# sourceMappingURL=taro-runtime.js.map