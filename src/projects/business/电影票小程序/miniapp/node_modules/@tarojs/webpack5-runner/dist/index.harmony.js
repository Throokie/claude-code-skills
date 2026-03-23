"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_1 = __importDefault(require("webpack"));
const HarmonyCombination_1 = require("./webpack/HarmonyCombination");
function build(appPath, rawConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const combination = new HarmonyCombination_1.HarmonyCombination(appPath, rawConfig);
        yield combination.make();
        // TODO Harmony 端暂不支持依赖预编译
        // const { enableSourceMap, entry = {}, runtimePath } = combination.config
        // const prebundle = new Prebundle({
        //   appPath,
        //   sourceRoot: combination.sourceRoot,
        //   chain: combination.chain,
        //   enableSourceMap,
        //   entry,
        //   isWatch: combination.config.isWatch,
        //   runtimePath,
        //   alias: combination.config.alias,
        //   defineConstants: combination.config.defineConstants,
        // })
        // try {
        //   await prebundle.run(combination.getPrebundleOptions())
        // } catch (error) {
        //   console.error(error)
        //   console.warn(chalk.yellow('依赖预编译失败，已经为您跳过预编译步骤，但是编译速度可能会受到影响。'))
        // }
        const webpackConfig = combination.chain.toConfig();
        const config = combination.config;
        return new Promise((resolve, reject) => {
            const compiler = (0, webpack_1.default)(webpackConfig);
            const onFinish = function (error, stats) {
                if (typeof config.onBuildFinish !== 'function')
                    return;
                config.onBuildFinish({
                    error,
                    stats,
                    isWatch: config.isWatch
                });
            };
            const callback = (err, stats) => __awaiter(this, void 0, void 0, function* () {
                if (err || stats.hasErrors()) {
                    const error = err !== null && err !== void 0 ? err : stats.toJson().errors;
                    onFinish(error, null);
                    return reject(error);
                }
                onFinish(null, stats);
                resolve(stats);
            });
            if (config.isWatch) {
                compiler.watch({
                    aggregateTimeout: 300,
                    poll: undefined
                }, callback);
            }
            else {
                compiler.run((error, stats) => {
                    compiler.close(err => callback(error || err, stats));
                });
            }
        });
    });
}
exports.default = build;
//# sourceMappingURL=index.harmony.js.map