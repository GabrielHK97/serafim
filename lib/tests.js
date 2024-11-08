"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
var Teste;
(function (Teste) {
    Teste["ONE"] = "1";
    Teste["TWO"] = "2";
})(Teste || (Teste = {}));
console.log((0, _1.getWhere)([
    {
        field: "accountId",
        operation: "EQUAL",
        value: "one",
    },
]));
