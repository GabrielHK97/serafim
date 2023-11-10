"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = exports.Order = exports.Where = exports.OperationTypes = exports.VarTypes = exports.getOrder = exports.getWhere = exports.getRelations = void 0;
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
var WhereOffset;
(function (WhereOffset) {
    WhereOffset[WhereOffset["KEY"] = 0] = "KEY";
    WhereOffset[WhereOffset["OPERATION"] = 1] = "OPERATION";
    WhereOffset[WhereOffset["VALUE"] = 2] = "VALUE";
    WhereOffset[WhereOffset["NUMBER_OF_PROPERTIES"] = 3] = "NUMBER_OF_PROPERTIES";
})(WhereOffset || (WhereOffset = {}));
function isNotLastPathElement(index, path) {
    return index < path.split(".").length - 1;
}
function isNumber(number) {
    return Number.isInteger(Number.parseInt(number));
}
function generatePathOfWhereObject(keys, key) {
    let path = keys.split(".");
    path.pop();
    return [...path, key].join(".");
}
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
            rawSQL = (0, typeorm_1.Raw)((alias) => {
                return `${alias} ${operation} ${value}`;
            });
            break;
        case var_types_constants_1.VarTypes.BIGINT:
            rawSQL = (0, typeorm_1.Raw)((alias) => {
                return `${alias} ${operation} ${value}`;
            });
            break;
        case var_types_constants_1.VarTypes.OBJECT:
            if (value instanceof Date) {
                rawSQL = (0, typeorm_1.Raw)((alias) => {
                    return `${alias} ${operation} '${value}'`;
                });
            }
            if (Array.isArray(value)) {
                if (operation === operation_types_constants_1.OperationTypes.BETWEEN) {
                    rawSQL = (0, typeorm_1.Raw)((alias) => {
                        return `${alias} ${operation_types_constants_1.OperationTypes.BETWEEN} ${typeof value[0] !== var_types_constants_1.VarTypes.NUMBER ||
                            typeof value[0] !== var_types_constants_1.VarTypes.BIGINT
                            ? `'${value[0]}'`
                            : value[0]} AND ${typeof value[1] !== var_types_constants_1.VarTypes.NUMBER ||
                            typeof value[1] !== var_types_constants_1.VarTypes.BIGINT
                            ? `'${value[1]}'`
                            : value[1]}`;
                    });
                }
                if (operation === operation_types_constants_1.OperationTypes.IN) {
                    const v = typeof value !== var_types_constants_1.VarTypes.BIGINT || typeof value !== var_types_constants_1.VarTypes.NUMBER
                        ? `(${value
                            .map((val) => {
                            return `'${val}'`;
                        })
                            .join(",")})`
                        : `(${value.join(",")})`;
                    rawSQL = (0, typeorm_1.Raw)((alias) => {
                        return `${alias} ${operation_types_constants_1.OperationTypes.IN} ${v}`;
                    });
                }
            }
            break;
        default:
            rawSQL = value;
            break;
    }
    return rawSQL;
}
function getAllKeysFromObject(object, lastPath = "") {
    return Object.entries(object).reduce((result, [key, value]) => {
        const currentObject = {
            path: lastPath
                ? Array.isArray(object) && lastPath.split("").includes(".")
                    ? lastPath
                    : `${lastPath}.${key}`
                : key,
            isObject: typeof value === var_types_constants_1.VarTypes.OBJECT,
        };
        return result
            .concat([
            currentObject,
            ...(currentObject.isObject && value !== null
                ? getAllKeysFromObject(value, currentObject.path)
                : []),
        ])
            .filter((element) => {
            return !element.isObject;
        });
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
    let property = object;
    path.split(".").forEach((key) => {
        if (property)
            property = property[key];
    });
    if (property != undefined) {
        return property;
    }
    else {
        return "";
    }
}
function setPropertyOfObject(path, object, value) {
    path.split(".").forEach((key, index) => {
        object[key] = isNotLastPathElement(index, path)
            ? object[key]
                ? object[key]
                : {}
            : value;
        if (object)
            object = object[key];
    });
}
function setPropertyWhereOfObject(path, object, value) {
    path.split(".").forEach((key, index) => {
        object[isNumber(key) ? 0 : key] = isNotLastPathElement(index, path)
            ? object[isNumber(key) ? 0 : key]
                ? object[isNumber(key) ? 0 : key]
                : isNumber(key)
                    ? []
                    : {}
            : value;
        if (object)
            object = object[isNumber(key) ? 0 : key];
    });
}
function removeLastElementOfPath(path) {
    let p = path.split(".");
    p.pop();
    return p.join(".");
}
function reduceWhereObject(obj) {
    const object = [];
    const keys = [
        ...new Set(getUniqueKeysFromObject(obj).map((key) => {
            return removeLastElementOfPath(key);
        })),
    ];
    keys.forEach((key) => {
        setPropertyWhereOfObject(key, object, getPropertyFromObject(key, obj));
    });
    return object;
}
function getRelations(where) {
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
function getWhere(where) {
    const object = {};
    const keys = getUniqueKeysFromObject(where);
    for (let index = 0; index < keys.length; index += WhereOffset.NUMBER_OF_PROPERTIES) {
        const key = getPropertyFromObject(keys[index + WhereOffset.KEY], where);
        const val = getPropertyFromObject(keys[index + WhereOffset.VALUE], where);
        let op = getPropertyFromObject(keys[index + WhereOffset.OPERATION], where);
        const value = val ? generateRawSQL(val, op) : (0, typeorm_1.IsNull)();
        const path = generatePathOfWhereObject(keys[index + WhereOffset.KEY], key);
        setPropertyOfObject(path, object, value);
    }
    return reduceWhereObject(object)[0];
}
exports.getWhere = getWhere;
function getOrder(orders) {
    let object = {};
    orders.forEach((order) => {
        setPropertyOfObject(order.field, object, order.sortOrder);
    });
    return object;
}
exports.getOrder = getOrder;
//console.log(
//  (
//    getWhere([
//      {
//        field: "debt.dueDate",
//        operation: OperationTypes.IN,
//        value: [OperationTypes.BETWEEN, OperationTypes.ILIKE],
//      },
//    ]) as any
//  ).debt.dueDate._getSql()
//);
