"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const operations_class_1 = require("./operations.class");
class Order extends operations_class_1.Operations {
    constructor(field, sortOrder) {
        super();
        this.field = field !== null && field !== void 0 ? field : "";
        this.sortOrder = sortOrder !== null && sortOrder !== void 0 ? sortOrder : SortConstants.UNSORTED;
    }
}
exports.Order = Order;
