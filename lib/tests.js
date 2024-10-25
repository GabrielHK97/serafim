"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
console.log((0, _1.getWhere)([
    {
        field: "debt.yourNumber",
        operation: "ILIKE",
        value: "%123%",
    },
    {
        field: "accountId",
        operation: "EQUAL",
        value: "e3c6e38c-d987-4ac0-ab9d-de24e1e0cebd",
    },
]));
