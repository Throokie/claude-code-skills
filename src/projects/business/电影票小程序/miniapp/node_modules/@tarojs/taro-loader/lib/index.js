"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const page_1 = require("./page");
function default_1(source) {
    const options = this.getOptions();
    if (options.type === 'app') {
        app_1.default.call(this, source);
    }
    else {
        page_1.default.call(this, source);
    }
}
exports.default = default_1;
//# sourceMappingURL=index.js.map