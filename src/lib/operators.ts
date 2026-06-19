import {
  Raw,
  IsNull,
  Not,
  Equal,
  MoreThan,
  MoreThanOrEqual,
  LessThan,
  LessThanOrEqual,
  Like,
  ILike,
  In,
  Between,
  FindOperator,
} from "typeorm";
import { OperationTypesEnum } from "../enums/operation-types.enum";

/**
 * Binary comparison operators map to TypeORM's parameterized operators, so the
 * searchTerm is always bound as a query parameter (never concatenated into SQL).
 */
const COMPARISON_BUILDERS: Partial<
  Record<OperationTypesEnum, (value: any) => FindOperator<any>>
> = {
  [OperationTypesEnum.EQUAL]: (v) => Equal(v),
  [OperationTypesEnum.NOT_EQUAL]: (v) => Not(Equal(v)),
  [OperationTypesEnum.GREATER]: (v) => MoreThan(v),
  [OperationTypesEnum.GREATER_EQUAL]: (v) => MoreThanOrEqual(v),
  [OperationTypesEnum.LESS]: (v) => LessThan(v),
  [OperationTypesEnum.LESS_EQUAL]: (v) => LessThanOrEqual(v),
};

/** Escapes LIKE/ILIKE wildcard characters so user input matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

function assertScalar(operation: OperationTypesEnum, value: any): void {
  if (Array.isArray(value)) {
    throw new Error(`Serafim: ${operation} expects a scalar searchTerm, got an array.`);
  }
}

/**
 * Translates a single (operation, searchTerm) pair into a TypeORM FindOperator.
 * Value-bearing operators are fully parameterized; unary operators ignore the
 * searchTerm. Throws on operand/operator mismatches (e.g. IN without an array).
 */
export function buildOperator(
  operation: OperationTypesEnum,
  value: any
): FindOperator<any> {
  // Unary operators: searchTerm is irrelevant, no user value reaches SQL.
  switch (operation) {
    case OperationTypesEnum.NULL:
    case OperationTypesEnum.IS:
      return IsNull();
    case OperationTypesEnum.NOT:
      return Not(IsNull());
    case OperationTypesEnum.TRUE:
      return Raw((alias) => `${alias} IS TRUE`);
    case OperationTypesEnum.FALSE:
      return Raw((alias) => `${alias} IS FALSE`);
  }

  // A null/undefined searchTerm on any other operator means "IS NULL".
  if (value === null || value === undefined) return IsNull();

  switch (operation) {
    case OperationTypesEnum.IN: {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("Serafim: IN requires a non-empty array searchTerm.");
      }
      return In(value);
    }
    case OperationTypesEnum.BETWEEN: {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(
          "Serafim: BETWEEN requires an array searchTerm of exactly 2 elements."
        );
      }
      return Between(value[0], value[1]);
    }
    case OperationTypesEnum.LIKE:
    case OperationTypesEnum.ILIKE: {
      if (typeof value !== "string") {
        throw new Error(`Serafim: ${operation} requires a string searchTerm.`);
      }
      const pattern = `%${escapeLike(value)}%`;
      return operation === OperationTypesEnum.LIKE ? Like(pattern) : ILike(pattern);
    }
    default: {
      const build = COMPARISON_BUILDERS[operation];
      if (!build) {
        throw new Error(`Serafim: unsupported operator "${operation}".`);
      }
      assertScalar(operation, value);
      return build(value);
    }
  }
}
