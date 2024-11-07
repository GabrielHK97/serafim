declare module "serafim" {
  export function getWhere(where: object): Array<object>;
  export function getRelations(where: object): object;
  export function getOrder(order: Order): object;

  export class Order {
    field: string;
    sortOrder: string;
  }

  export class Where {
    field: string;
    operation: OperationTypes;
    value: any;
  }

  export class Search {
    where?: Where[];
    order?: Order;
  }

  export class FindParams {
    search?: Search;
    skip?: number;
    take?: number;
  }

  export enum VarTypes {
    STRING = "string",
    DATE = "date",
    NUMBER = "number",
    BIGINT = "bigint",
    OBJECT = "object",
  }

  export enum OperationTypes {
    ILIKE = "ILIKE",
    LIKE = "LIKE",
    IN = "IN",
    BETWEEN = "BETWEEN",
    IS = "IS",
    NOT = "NOT",
    NULL = "NULL",
    TRUE = "TRUE",
    FALSE = "FALSE",
    EQUAL = "=",
    NOT_EQUAL = "!=",
    GREATER = ">",
    GREATER_EQUAL = ">=",
    LESS = "<",
    LESS_EQUAL = "<=",
  }
}
