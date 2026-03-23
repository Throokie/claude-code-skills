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
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("node:path");
const envinfo = require("envinfo");
const util_1 = require("../../util");
exports.default = (ctx) => {
    ctx.registerCommand({
        name: 'info',
        synopsisList: [
            'taro info',
            'taro info rn'
        ],
        fn(_a) {
            return __awaiter(this, arguments, void 0, function* ({ _ }) {
                const rn = _[1] === 'rn';
                const { fs, chalk, PROJECT_CONFIG } = ctx.helper;
                const { appPath, configPath } = ctx.paths;
                if (!configPath || !fs.existsSync(configPath)) {
                    console.log(chalk.red(`找不到项目配置文件${PROJECT_CONFIG}，请确定当前目录是 Taro 项目根目录!`));
                    process.exit(1);
                }
                if (rn) {
                    const tempPath = path.join(appPath, '.rn_temp');
                    if (fs.lstatSync(tempPath).isDirectory()) {
                        process.chdir('.rn_temp');
                    }
                }
                yield info({}, ctx);
            });
        }
    });
};
// 单独function获取@jdtaro相关的包
function getJdtaroPackages(ctx) {
    try {
        const { appPath } = ctx.paths;
        const fs = ctx.helper.fs;
        const packageJsonPath = path.join(appPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            const dependencies = Object.assign({}, packageJson.dependencies || {}, packageJson.devDependencies || {});
            // 筛选出@jdtaro相关的包
            return Object.keys(dependencies).filter(pkg => pkg.startsWith('@jdtaro/'));
        }
    }
    catch (error) {
        // 记录错误但不中断程序执行（添加trycatch）
        console.error('读取或解析package.json时发生错误:', error.message);
    }
    return [];
}
function info(options, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        let npmPackages = ctx.helper.UPDATE_PACKAGE_LIST.concat(['react', 'react-native', 'expo', 'taro-ui']);
        // 调用新函数获取@jdtaro相关包
        const jdtaroPackages = getJdtaroPackages(ctx);
        npmPackages = npmPackages.concat(jdtaroPackages);
        const info = yield envinfo.run(Object.assign({}, {
            System: ['OS', 'Shell'],
            Binaries: ['Node', 'Yarn', 'npm'],
            npmPackages,
            npmGlobalPackages: ['typescript']
        }, options), {
            title: `Taro CLI ${(0, util_1.getPkgVersion)()} environment info`
        });
        console.log(info);
    });
}
//# sourceMappingURL=info.js.map