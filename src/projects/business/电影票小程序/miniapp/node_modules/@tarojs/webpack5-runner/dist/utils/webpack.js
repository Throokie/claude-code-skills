"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetsMaxSize = exports.errorHandling = exports.chunkHasJs = exports.getChunkIdOrName = exports.getChunkEntryModule = exports.addRequireToSource = void 0;
const node_path_1 = __importDefault(require("node:path"));
const helper_1 = require("@tarojs/helper");
const shared_1 = require("@tarojs/shared");
const webpack_1 = require("webpack");
const { ConcatSource } = webpack_1.sources;
/**
 * 在文本头部加入一些 require 语句
 */
function addRequireToSource(id, modules, commonChunks) {
    const source = new ConcatSource();
    commonChunks.forEach(chunkItem => {
        source.add(`require(${JSON.stringify((0, helper_1.promoteRelativePath)(node_path_1.default.relative(id, chunkItem.name)))});\n`);
    });
    source.add('\n');
    source.add(modules);
    source.add(';');
    return source;
}
exports.addRequireToSource = addRequireToSource;
function getChunkEntryModule(compilation, chunk) {
    const chunkGraph = compilation.chunkGraph;
    const entryModules = Array.from(chunkGraph.getChunkEntryModulesIterable(chunk));
    if (entryModules.length) {
        return entryModules[0];
    }
}
exports.getChunkEntryModule = getChunkEntryModule;
function getChunkIdOrName(chunk) {
    if (typeof chunk.id === 'string') {
        return chunk.id;
    }
    return chunk.name;
}
exports.getChunkIdOrName = getChunkIdOrName;
function chunkHasJs(chunk, chunkGraph) {
    if (chunk.name === chunk.runtime)
        return true;
    if (chunkGraph.getNumberOfEntryModules(chunk) > 0)
        return true;
    return Boolean(chunkGraph.getChunkModulesIterableBySourceType(chunk, 'javascript'));
}
exports.chunkHasJs = chunkHasJs;
function errorHandling(errorLevel, stats) {
    if (errorLevel === 1 && (stats === null || stats === void 0 ? void 0 : stats.hasErrors())) {
        process.exit(1);
    }
}
exports.errorHandling = errorHandling;
function getAssetsMaxSize(options, defaultValue) {
    // Note:limit 为 false 时，不限制大小 全部转为 base64
    const { limit } = options;
    let maxSize;
    if ((0, shared_1.isBoolean)(limit)) {
        maxSize = limit ? 0 : Number.MAX_SAFE_INTEGER;
    }
    else {
        maxSize = limit || defaultValue;
    }
    return maxSize;
}
exports.getAssetsMaxSize = getAssetsMaxSize;
//# sourceMappingURL=webpack.js.map