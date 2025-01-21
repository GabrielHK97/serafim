"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
console.log((0, _1.getWhere)([
    {
        field: 'removedAtDate',
        operation: _1.OperationTypes.EQUAL,
        value: null,
    },
    {
        field: 'onlineStore',
        operation: _1.OperationTypes.EQUAL,
        value: false,
    },
]));
