"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
class Order {
    constructor(field, sortOrder) {
        this.field = field !== null && field !== void 0 ? field : '';
        this.sortOrder = sortOrder !== null && sortOrder !== void 0 ? sortOrder : SortConstants.UNSORTED;
    }
}
exports.Order = Order;
