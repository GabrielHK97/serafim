"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Where = void 0;
const operation_types_constants_1 = require("../constants/operation-types.constants");
class Where {
    constructor(field, operation, value) {
        this.field = field !== null && field !== void 0 ? field : '';
        this.operation = operation !== null && operation !== void 0 ? operation : operation_types_constants_1.OperationTypes.EQUAL;
        this.value = value !== null && value !== void 0 ? value : '';
    }
}
exports.Where = Where;
