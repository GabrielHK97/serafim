import { Raw, IsNull } from "typeorm";
import { OperationTypes } from "./constants/operation-types.constants";
import { VarTypes } from "./constants/var-types.constants";
import { Order } from "./classes/order.class";
import { Search } from "./classes/search.class";
import { Where } from "./classes/where.class";
import { FindParams } from "./classes/find-params.class";

enum WhereOffset {
  KEY = 0,
  OPERATION = 1,
  VALUE = 2,
  NUMBER_OF_PROPERTIES = 3,
}

interface Property {
  path: string;
  isObject: boolean;
}

function isNotLastPathElement(index: number, path: string): boolean {
  return index < path.split(".").length - 1;
}

function isNumber(number: string): boolean {
  return Number.isInteger(Number.parseInt(number));
}

function generatePathOfWhereObject(keys: string, key: string): string {
  let path = keys.split(".");
  path.pop();
  return [...path, key].join(".");
}

function generateRawSQL(value: any, operation: string): any {
  let rawSQL;
  switch (typeof value) {
    case VarTypes.STRING:
      rawSQL = Raw((alias) => {
        return [
          OperationTypes.NULL,
          OperationTypes.TRUE,
          OperationTypes.FALSE,
        ].includes(value)
          ? `${alias} ${operation} ${value}`
          : `${alias} ${operation} '${value}'`;
      });
      break;
    case VarTypes.NUMBER:
      rawSQL = Raw((alias) => {
        return `${alias} ${operation} ${value}`;
      });
      break;
    case VarTypes.BIGINT:
      rawSQL = Raw((alias) => {
        return `${alias} ${operation} ${value}`;
      });
      break;
    case VarTypes.OBJECT:
      if (value instanceof Date) {
        rawSQL = Raw((alias) => {
          return `${alias} ${operation} '${value}'`;
        });
      }
      if (Array.isArray(value)) {
        if (operation === OperationTypes.BETWEEN) {
          rawSQL = Raw((alias) => {
            return `${alias} ${OperationTypes.BETWEEN} ${
              typeof value[0] !== VarTypes.NUMBER ||
              typeof value[0] !== VarTypes.BIGINT
                ? `'${value[0]}'`
                : value[0]
            } AND ${
              typeof value[1] !== VarTypes.NUMBER ||
              typeof value[1] !== VarTypes.BIGINT
                ? `'${value[1]}'`
                : value[1]
            }`;
          });
        }
        if (operation === OperationTypes.IN) {
          const v =
            typeof value !== VarTypes.BIGINT || typeof value !== VarTypes.NUMBER
              ? `(${value
                  .map((val) => {
                    return `'${val}'`;
                  })
                  .join(",")})`
              : `(${value.join(",")})`;
          rawSQL = Raw((alias) => {
            return `${alias} ${OperationTypes.IN} ${v}`;
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

function getAllKeysFromObject<T extends object>(
  object: T,
  lastPath: string = ""
): any {
  return Object.entries(object).reduce((result: string[], [key, value]) => {
    const currentObject: Property = {
      path: lastPath
        ? Array.isArray(object) && lastPath.split("").includes(".")
          ? lastPath
          : `${lastPath}.${key}`
        : key,
      isObject: typeof value === VarTypes.OBJECT,
    };
    return result
      .concat([
        currentObject,
        ...(currentObject.isObject && value !== null
          ? getAllKeysFromObject(value, currentObject.path)
          : []),
      ])
      .filter((element: any) => {
        return !element.isObject;
      });
  }, []);
}

function getUniqueKeysFromObject(object: object) {
  return [
    ...new Set(
      getAllKeysFromObject(object).map((element: Property) => {
        return element.path;
      })
    ),
  ] as any;
}

function getPropertyFromObject(path: string, object: object): any {
  let property = object;
  path.split(".").forEach((key) => {
    if (property) property = property[key];
  });
  if (property != undefined) {
    return property;
  } else {
    return "";
  }
}

function setPropertyOfObject(path: string, object: object, value: any): void {
  path.split(".").forEach((key, index) => {
    object[key] = isNotLastPathElement(index, path)
      ? object[key]
        ? object[key]
        : {}
      : value;
    if (object) object = object[key];
  });
}

function setPropertyWhereOfObject(
  path: string,
  object: object,
  value: any
): void {
  path.split(".").forEach((key, index) => {
    object[isNumber(key) ? 0 : key] = isNotLastPathElement(index, path)
      ? object[isNumber(key) ? 0 : key]
        ? object[isNumber(key) ? 0 : key]
        : {}
      : value;
    if (object) object = object[isNumber(key) ? 0 : key];
  });
}

function removeLastElementOfPath(path: string): string {
  let p = path.split(".");
  p.pop();
  return p.join(".");
}

function reduceWhereObject(object: object) {
  const obj = [];
  const keys = [
    ...new Set(
      getUniqueKeysFromObject(object).map((key) => {
        return removeLastElementOfPath(key);
      })
    ),
  ] as string[];
  keys.forEach((key) => {
    setPropertyWhereOfObject(key, obj, getPropertyFromObject(key, object));
  });
  return obj;
}

export function getRelations(where: object): object {
  if (!where) return {};
  const object: any = {};
  const keys = getUniqueKeysFromObject(where);
  for (
    let index = 0;
    index < keys.length;
    index += WhereOffset.NUMBER_OF_PROPERTIES
  ) {
    const key = getPropertyFromObject(
      keys[index + WhereOffset.KEY],
      where
    ).split(".");
    key.pop();
    if (key.length > 0) setPropertyOfObject(key.join("."), object, true);
  }
  return object;
}

export function getWhere(where: object): Array<object> {
  if (!where) return [];
  const object: any = {};
  const keys = getUniqueKeysFromObject(where);
  for (
    let index = 0;
    index < keys.length;
    index += WhereOffset.NUMBER_OF_PROPERTIES
  ) {
    const key = getPropertyFromObject(keys[index + WhereOffset.KEY], where);
    const val = getPropertyFromObject(keys[index + WhereOffset.VALUE], where);
    let op = getPropertyFromObject(keys[index + WhereOffset.OPERATION], where);
    const value = val ? generateRawSQL(val, op) : IsNull();
    const path = generatePathOfWhereObject(keys[index + WhereOffset.KEY], key);
    setPropertyOfObject(path, object, value);
  }
  return reduceWhereObject(object);
}

export function getOrder(order: Order): object {
  if (!order) return {};
  let object: any = {};
  setPropertyOfObject(order.field, object, order.sortOrder);
  return object;
}

export { VarTypes, OperationTypes, Where, Order, Search, FindParams };
