"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindParams = exports.Where = exports.Search = exports.Order = exports.getOrder = exports.getRelations = exports.OperationTypes = exports.VarTypes = exports.getWhere = exports.OR = exports.AND = void 0;
const typeorm_1 = require("typeorm");
const operation_types_constants_1 = require("./constants/operation-types.constants");
Object.defineProperty(exports, "OperationTypes", { enumerable: true, get: function () { return operation_types_constants_1.OperationTypes; } });
const var_types_constants_1 = require("./constants/var-types.constants");
Object.defineProperty(exports, "VarTypes", { enumerable: true, get: function () { return var_types_constants_1.VarTypes; } });
const order_class_1 = require("./classes/order.class");
Object.defineProperty(exports, "Order", { enumerable: true, get: function () { return order_class_1.Order; } });
const search_class_1 = require("./classes/search.class");
Object.defineProperty(exports, "Search", { enumerable: true, get: function () { return search_class_1.Search; } });
const where_class_1 = require("./classes/where.class");
Object.defineProperty(exports, "Where", { enumerable: true, get: function () { return where_class_1.Where; } });
const find_params_class_1 = require("./classes/find-params.class");
Object.defineProperty(exports, "FindParams", { enumerable: true, get: function () { return find_params_class_1.FindParams; } });
/**
 * AND(...) => { $and: [ ... ] }
 */
function AND(...conditions) {
    return { $and: conditions };
}
exports.AND = AND;
/**
 * OR(...) => { $or: [ ... ] }
 */
function OR(...conditions) {
    return { $or: conditions };
}
exports.OR = OR;
var WhereOffset;
(function (WhereOffset) {
    WhereOffset[WhereOffset["KEY"] = 0] = "KEY";
    WhereOffset[WhereOffset["OPERATION"] = 1] = "OPERATION";
    WhereOffset[WhereOffset["VALUE"] = 2] = "VALUE";
    WhereOffset[WhereOffset["NUMBER_OF_PROPERTIES"] = 3] = "NUMBER_OF_PROPERTIES";
})(WhereOffset || (WhereOffset = {}));
/**
 * The main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old style).
 */
function getWhere(expression) {
    if (!expression)
        return {};
    // If the user passes an array => treat as AND
    if (Array.isArray(expression)) {
        if (expression.length === 0)
            return {};
        const exprObject = { $and: expression };
        const arr = parseWhereExpression(exprObject);
        if (arr.length === 0)
            return {};
        if (arr.length === 1)
            return arr[0];
        return arr;
    }
    // Else parse a single expression
    const arr = parseWhereExpression(expression);
    if (arr.length === 0)
        return {};
    if (arr.length === 1)
        return arr[0];
    return arr;
}
exports.getWhere = getWhere;
/**
 * Check if object is { $and: ... }
 */
function isAndNode(obj) {
    return obj && typeof obj === "object" && "$and" in obj && Array.isArray(obj.$and);
}
/**
 * Check if object is { $or: ... }
 */
function isOrNode(obj) {
    return obj && typeof obj === "object" && "$or" in obj && Array.isArray(obj.$or);
}
/**
 * parseWhereExpression:
 *  - AND => cartesianAndMerge
 *  - OR  => flatten (via reduce+concat)
 *  - leaf => single array
 */
function parseWhereExpression(expr) {
    if (isAndNode(expr)) {
        const childArrays = expr.$and.map((child) => parseWhereExpression(child));
        return cartesianAndMerge(childArrays);
    }
    else if (isOrNode(expr)) {
        const childArrays = expr.$or.map((child) => parseWhereExpression(child));
        // Replace `.flat()` with a reduce+concat approach for older ES targets
        return childArrays.reduce((acc, arr) => acc.concat(arr), []);
    }
    else {
        // Leaf => single
        return [convertLeafToTypeOrmObject(expr)];
    }
}
/**
 * "Cartesian product" for AND => merge objects pairwise
 */
function cartesianAndMerge(childArrays) {
    let result = [{}];
    for (const arr of childArrays) {
        const newResult = [];
        for (const existingObj of result) {
            for (const currentObj of arr) {
                newResult.push(deepMerge(existingObj, currentObj));
            }
        }
        result = newResult;
    }
    return result;
}
/**
 * If it's a leaf, that means it's your Where class, e.g.
 *   { field, operation, value }
 * We build a nested object => { user: { name: ... } }
 */
function convertLeafToTypeOrmObject(leaf) {
    const field = leaf.field;
    const operation = leaf.operation || "=";
    const value = leaf.value;
    const generatedValue = (value === null) ? (0, typeorm_1.IsNull)() : generateRawSQL(value, operation);
    // Build nested path
    const obj = {};
    setPropertyOfObject(field, obj, generatedValue);
    return obj;
}
/**
 * Deeply merges two objects that have nested paths
 */
function deepMerge(target, source) {
    var _a;
    const output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
        const val = source[key];
        if (val &&
            typeof val === "object" &&
            !Array.isArray(val) &&
            !(val instanceof Date) &&
            !(((_a = val.constructor) === null || _a === void 0 ? void 0 : _a.name) === "FindOperator")) {
            if (output[key] && typeof output[key] === "object") {
                output[key] = deepMerge(output[key], val);
            }
            else {
                output[key] = Object.assign({}, val);
            }
        }
        else {
            output[key] = val;
        }
    }
    return output;
}
/**
 * Convert value + operation => TypeORM Raw or IsNull
 */
function generateRawSQL(value, operation) {
    let rawSQL;
    switch (typeof value) {
        case var_types_constants_1.VarTypes.STRING:
            rawSQL = (0, typeorm_1.Raw)((alias) => {
                if ([operation_types_constants_1.OperationTypes.NULL, operation_types_constants_1.OperationTypes.TRUE, operation_types_constants_1.OperationTypes.FALSE].includes(value)) {
                    return `${alias} ${operation} ${value}`;
                }
                return `${alias} ${operation} '${value}'`;
            });
            break;
        case var_types_constants_1.VarTypes.NUMBER:
        case var_types_constants_1.VarTypes.BIGINT:
            rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} ${operation} ${value}`);
            break;
        case var_types_constants_1.VarTypes.OBJECT:
            if (value instanceof Date) {
                rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} ${operation} '${value.toISOString()}'`);
            }
            else if (Array.isArray(value)) {
                if (operation === operation_types_constants_1.OperationTypes.BETWEEN) {
                    rawSQL = (0, typeorm_1.Raw)((alias) => {
                        const left = typeof value[0] === "number" ? value[0] : `'${value[0]}'`;
                        const right = typeof value[1] === "number" ? value[1] : `'${value[1]}'`;
                        return `${alias} BETWEEN ${left} AND ${right}`;
                    });
                }
                else if (operation === operation_types_constants_1.OperationTypes.IN) {
                    const v = value
                        .map((val) => (typeof val === "number" ? val : `'${val}'`))
                        .join(",");
                    rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} IN (${v})`);
                }
            }
            break;
        default:
            // boolean, undefined, etc.
            rawSQL = value;
            break;
    }
    return rawSQL;
}
/**
 * If field="user.person.name",
 * setPropertyOfObject(field, {}, X)
 * => { user: { person: { name: X } } }
 */
function setPropertyOfObject(path, object, value) {
    const keys = path.split(".");
    let current = object;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
            current[key] = value;
        }
        else {
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
    }
}
/**
 * If your "Where" is a class from "./classes/where.class"
 * it might look like this:
 *
 * export class Where {
 *   constructor(
 *     public field: string,
 *     public operation?: string,
 *     public value?: any
 *   ) {}
 * }
 */
// We assume you import it above
var MyLocalWhereOffset;
(function (MyLocalWhereOffset) {
    MyLocalWhereOffset[MyLocalWhereOffset["KEY"] = 0] = "KEY";
    MyLocalWhereOffset[MyLocalWhereOffset["OPERATION"] = 1] = "OPERATION";
    MyLocalWhereOffset[MyLocalWhereOffset["VALUE"] = 2] = "VALUE";
    MyLocalWhereOffset[MyLocalWhereOffset["NUMBER_OF_PROPERTIES"] = 3] = "NUMBER_OF_PROPERTIES";
})(MyLocalWhereOffset || (MyLocalWhereOffset = {}));
/**
 * Return a minimal set of relationships from a where object.
 * If you rely on nested logic, you might need to adapt or remove.
 */
function getRelations(where) {
    if (!where)
        return {};
    const object = {};
    const keys = getUniqueKeysFromObject(where); // => string[]
    for (let index = 0; index < keys.length; index += MyLocalWhereOffset.NUMBER_OF_PROPERTIES) {
        const strKey = String(keys[index]); // cast to string
        const pathVal = getPropertyFromObject(strKey, where);
        if (typeof pathVal === "string" && pathVal.includes(".")) {
            const parts = pathVal.split(".");
            parts.pop();
            if (parts.length > 0)
                setPropertyOfObject(parts.join("."), object, true);
        }
    }
    return object;
}
exports.getRelations = getRelations;
/**
 * A naive approach for turning an object into an array of { key: value }.
 */
function reduceWhereObject(object) {
    return Object.entries(object).map(([k, v]) => ({ [k]: v }));
}
/**
 * Example "getOrder" for sorting
 */
function getOrder(order) {
    if (!order)
        return {};
    const obj = {};
    setPropertyOfObject(order.field, obj, order.sortOrder);
    return obj;
}
exports.getOrder = getOrder;
/**
 * For scanning object keys
 */
function getAllKeysFromObject(obj, lastPath = "") {
    return Object.entries(obj).reduce((result, [key, value]) => {
        const path = lastPath ? `${lastPath}.${key}` : key;
        const isObj = (value && typeof value === "object");
        return result
            .concat([
            { path, isObject: isObj },
            ...(isObj ? getAllKeysFromObject(value, path) : []),
        ])
            .filter((element) => !element.isObject);
    }, []);
}
/**
 * Return a unique list of string paths
 */
function getUniqueKeysFromObject(object) {
    const arr = getAllKeysFromObject(object);
    const paths = arr.map((el) => el.path);
    return Array.from(new Set(paths));
}
/**
 * Return the property from an object at a dot path, e.g. "user.person.name"
 */
function getPropertyFromObject(path, obj) {
    if (!path)
        return null;
    const segments = path.split(".");
    let current = obj;
    for (const seg of segments) {
        if (current && typeof current === "object" && seg in current) {
            current = current[seg];
        }
        else {
            return "";
        }
    }
    return current;
}
