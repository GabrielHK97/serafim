"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindParams = exports.Search = exports.Order = exports.Where = exports.OperationTypes = exports.VarTypes = exports.getOrder = exports.getRelations = exports.getWhere = exports.OR = exports.AND = void 0;
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
 * These helpers allow you to write:
 *   AND(condition1, condition2, OR(...))
 *   OR(condition1, condition2, AND(...))
 */
function AND(...conditions) {
    return { $and: conditions };
}
exports.AND = AND;
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
 * Convert a value + operation into a TypeORM Raw expression or IsNull, etc.
 * Re-uses your existing logic for BETWEEN, IN, etc.
 */
function generateRawSQL(value, operation) {
    let rawSQL;
    switch (typeof value) {
        case var_types_constants_1.VarTypes.STRING:
            rawSQL = (0, typeorm_1.Raw)((alias) => {
                return [
                    operation_types_constants_1.OperationTypes.NULL,
                    operation_types_constants_1.OperationTypes.TRUE,
                    operation_types_constants_1.OperationTypes.FALSE,
                ].includes(value)
                    ? `${alias} ${operation} ${value}`
                    : `${alias} ${operation} '${value}'`;
            });
            break;
        case var_types_constants_1.VarTypes.NUMBER:
        case var_types_constants_1.VarTypes.BIGINT:
            rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} ${operation} ${value}`);
            break;
        case var_types_constants_1.VarTypes.OBJECT:
            if (value instanceof Date) {
                // Convert the date to ISO (or your desired string format)
                rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} ${operation} '${value.toISOString()}'`);
            }
            else if (Array.isArray(value)) {
                // Handle special operations: BETWEEN, IN
                if (operation === operation_types_constants_1.OperationTypes.BETWEEN) {
                    rawSQL = (0, typeorm_1.Raw)((alias) => {
                        const left = typeof value[0] === var_types_constants_1.VarTypes.NUMBER || typeof value[0] === var_types_constants_1.VarTypes.BIGINT
                            ? value[0]
                            : `'${value[0]}'`;
                        const right = typeof value[1] === var_types_constants_1.VarTypes.NUMBER || typeof value[1] === var_types_constants_1.VarTypes.BIGINT
                            ? value[1]
                            : `'${value[1]}'`;
                        return `${alias} ${operation_types_constants_1.OperationTypes.BETWEEN} ${left} AND ${right}`;
                    });
                }
                else if (operation === operation_types_constants_1.OperationTypes.IN) {
                    // For IN, we quote each element if it's not numeric
                    const v = value
                        .map((val) => (typeof val === var_types_constants_1.VarTypes.NUMBER ? val : `'${val}'`))
                        .join(",");
                    rawSQL = (0, typeorm_1.Raw)((alias) => `${alias} ${operation_types_constants_1.OperationTypes.IN} (${v})`);
                }
            }
            break;
        default:
            // If it's boolean, undefined, or any other type, fallback
            rawSQL = value;
            break;
    }
    return rawSQL;
}
/**
 * Detect if an object is { $and: [ ... ] }
 */
function isAndNode(obj) {
    return obj && typeof obj === "object" && "$and" in obj && Array.isArray(obj.$and);
}
/**
 * Detect if an object is { $or: [ ... ] }
 */
function isOrNode(obj) {
    return obj && typeof obj === "object" && "$or" in obj && Array.isArray(obj.$or);
}
/**
 * Instead of returning { [field]: ... }, we create a nested object.
 * If field = "user.person.address.name", we build:
 * {
 *   user: {
 *     person: {
 *       address: {
 *         name: generatedValue
 *       }
 *     }
 *   }
 * }
 */
function convertLeafToTypeOrmObject(leaf) {
    const field = leaf.field;
    const operation = leaf.operation || "=";
    const value = leaf.value;
    // If null, use IsNull() so TypeORM does "IS NULL"
    const generatedValue = value === null ? (0, typeorm_1.IsNull)() : generateRawSQL(value, operation);
    // Build nested object from the "field" path
    const obj = {};
    setPropertyOfObject(field, obj, generatedValue);
    return obj;
}
/**
 * Parse a nested AND/OR expression into an array of objects that TypeORM understands.
 * - AND => cartesian product merge of children
 * - OR  => flat union of children
 * - Leaf => single array entry
 */
function parseWhereExpression(expr) {
    // 1) AND node => cartesian product/merge
    if (isAndNode(expr)) {
        const childArrays = expr.$and.map((child) => parseWhereExpression(child));
        return cartesianAndMerge(childArrays);
    }
    // 2) OR node => flatten union
    if (isOrNode(expr)) {
        const childArrays = expr.$or.map((child) => parseWhereExpression(child));
        return childArrays.flat();
    }
    // 3) Leaf => single condition => single array item
    return [convertLeafToTypeOrmObject(expr)];
}
/**
 * "Cartesian product" for AND:
 * If we have e.g. [ [o1, o2], [o3, o4] ],
 * we return [ {..o1.., ..o3..}, {..o1.., ..o4..}, {..o2.., ..o3..}, {..o2.., ..o4..} ]
 *
 * Because these merged objects might also have nested paths,
 * merging means something like:
 * {
 *   user: { person: { name: 'x' } }
 * }
 * AND
 * {
 *   user: { person: { age: 10 } }
 * }
 * =>
 * {
 *   user: { person: { name: 'x', age: 10 } }
 * }
 */
function cartesianAndMerge(childArrays) {
    let result = [{}]; // start with one empty object
    for (const arr of childArrays) {
        const newResult = [];
        for (const existingObj of result) {
            for (const currentObj of arr) {
                // Merge existingObj + currentObj => combined
                newResult.push(deepMerge(existingObj, currentObj));
            }
        }
        result = newResult;
    }
    return result;
}
/**
 * Deeply merges two objects that may contain nested fields.
 * If both have { user: { person: {} } }, merges them recursively.
 */
function deepMerge(target, source) {
    var _a;
    const output = Object.assign({}, target);
    for (const key of Object.keys(source)) {
        if (source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key]) &&
            !(source[key] instanceof Date) &&
            !(((_a = source[key].constructor) === null || _a === void 0 ? void 0 : _a.name) === "FindOperator")) {
            // if target[key] is also an object, merge recursively
            if (target[key] && typeof target[key] === "object") {
                output[key] = deepMerge(target[key], source[key]);
            }
            else {
                output[key] = Object.assign({}, source[key]);
            }
        }
        else {
            // overwrite
            output[key] = source[key];
        }
    }
    return output;
}
/**
 * This is the main entry point for building a TypeORM-compatible "where" clause
 * from nested AND/OR expressions or from an array of leaf conditions (old plugin style).
 */
function getWhere(expression) {
    if (!expression)
        return {};
    // If the user passes an array of "leaf" conditions => interpret as AND of them
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
    // Otherwise parse the single expression (leaf, $and, or $or)
    const arr = parseWhereExpression(expression);
    if (arr.length === 0)
        return {};
    if (arr.length === 1)
        return arr[0];
    return arr;
}
exports.getWhere = getWhere;
/* ==========================
 *  YOUR EXISTING UTILITIES
 * ========================== */
/**
 * Return a minimal set of relationships from a where object.
 * This was your existing approach but might need adjusting
 * if you rely on the old (flat) structure.
 */
function getAllKeysFromObject(object, lastPath = "") {
    return Object.entries(object).reduce((result, [key, value]) => {
        const currentObject = {
            path: lastPath
                ? Array.isArray(object) && lastPath.split("").includes(".")
                    ? lastPath
                    : `${lastPath}.${key}`
                : key,
            isObject: typeof value === var_types_constants_1.VarTypes.OBJECT && value !== null,
        };
        return result
            .concat([
            currentObject,
            ...(currentObject.isObject
                ? getAllKeysFromObject(value, currentObject.path)
                : []),
        ])
            .filter((element) => !element.isObject);
    }, []);
}
function getUniqueKeysFromObject(object) {
    return [
        ...new Set(getAllKeysFromObject(object).map((element) => {
            return element.path;
        })),
    ];
}
function getPropertyFromObject(path, object) {
    if (!path)
        return null;
    let property = object;
    const keys = path.split(".");
    for (const key of keys) {
        if (property && typeof property === "object" && key in property) {
            property = property[key];
        }
        else {
            return "";
        }
    }
    return property;
}
function setPropertyOfObject(path, object, value) {
    const keys = path.split(".");
    let current = object;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
            // last key => set the value
            current[key] = value;
        }
        else {
            // ensure the path exists
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
    }
}
function reduceWhereObject(object) {
    return Object.entries(object).map(([key, value]) => ({ [key]: value }));
}
/**
 * Because you originally had a "getRelations" function that infers relationships
 * from the where object, you can keep it, but nested logic might require rethinking.
 */
function getRelations(where) {
    if (!where)
        return {};
    const object = {};
    const keys = getUniqueKeysFromObject(where);
    for (let index = 0; index < keys.length; index += WhereOffset.NUMBER_OF_PROPERTIES) {
        const key = getPropertyFromObject(keys[index + WhereOffset.KEY], where).split(".");
        key.pop();
        if (key.length > 0)
            setPropertyOfObject(key.join("."), object, true);
    }
    return object;
}
exports.getRelations = getRelations;
/**
 * Reuse your "getOrder" for sorting:
 */
function getOrder(order) {
    if (!order)
        return {};
    let object = {};
    setPropertyOfObject(order.field, object, order.sortOrder);
    return object;
}
exports.getOrder = getOrder;
