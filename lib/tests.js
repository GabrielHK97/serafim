"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
console.log((0, _1.getWhere)((0, _1.AND)({
    field: "storeId",
    operation: _1.OperationTypes.EQUAL,
    value: 123,
})));
