# Operators

## SQL injection safety

Every `searchTerm` is passed to TypeORM's native, **parameterized** operators
(`Equal`, `MoreThan`, `In`, `Between`, `Like`, `ILike`, …). User input is therefore
bound as a query parameter and is **never concatenated into raw SQL**, so a value such
as `"x'; DROP TABLE users; --"` is matched literally instead of being executed. The
unary operators (`NULL`, `IS`, `NOT`, `TRUE`, `FALSE`) carry no user-supplied value at
all.

## Operators available

Every operator lives in the `OperationTypesEnum`.

| Operator | SQL | `searchTerm` |
| --- | --- | --- |
| `EQUAL` | `=` | scalar (default operator) |
| `NOT_EQUAL` | `!=` | scalar |
| `GREATER` | `>` | scalar |
| `GREATER_EQUAL` | `>=` | scalar |
| `LESS` | `<` | scalar |
| `LESS_EQUAL` | `<=` | scalar |
| `LIKE` | `LIKE '%x%'` | string |
| `ILIKE` | `ILIKE '%x%'` | string |
| `IN` | `IN (n1, n2, ...)` | non-empty array |
| `BETWEEN` | `BETWEEN x AND y` | array of exactly 2 |
| `NULL` / `IS` | `IS NULL` | ignored |
| `NOT` | `IS NOT NULL` | ignored |
| `TRUE` | `IS TRUE` | ignored |
| `FALSE` | `IS FALSE` | ignored |

A *scalar* is a number, bigint, boolean, string or `Date`.

## Default operator

If `operation` is omitted, the default is `EQUAL`:

```ts
import { OperationTypesEnum } from "serafim";

const a = { field: "quantity", searchTerm: 10 };
const b = { field: "quantity", operation: OperationTypesEnum.EQUAL, searchTerm: 10 };
// a and b are equivalent
```

## Comparison operators

```ts
{ field: "quantity", operation: OperationTypesEnum.GREATER, searchTerm: 5 }
// quantity > 5
```

## LIKE / ILIKE

The value is wrapped with `%...%` and bound as a parameter. `%` and `_` inside the
value are escaped so they match literally. `ILIKE` is PostgreSQL-specific.

```ts
{ field: "username", operation: OperationTypesEnum.ILIKE, searchTerm: "gab" }
// username ILIKE '%gab%'
```

## IN and BETWEEN

`searchTerm` is an array. `IN` accepts any non-empty length; `BETWEEN` requires
exactly two elements:

```ts
{ field: "quantity", operation: OperationTypesEnum.IN, searchTerm: [10, 20, 30, 40] }
// quantity IN (10, 20, 30, 40)

{ field: "quantity", operation: OperationTypesEnum.BETWEEN, searchTerm: [10, 20] }
// quantity BETWEEN 10 AND 20
```

## Null, NOT, TRUE and FALSE

These are **unary**: they ignore `searchTerm`.

```ts
{ field: "deletedAt", operation: OperationTypesEnum.NULL } // deletedAt IS NULL
{ field: "deletedAt", operation: OperationTypesEnum.IS }   // deletedAt IS NULL (alias)
{ field: "deletedAt", operation: OperationTypesEnum.NOT }  // deletedAt IS NOT NULL
{ field: "active", operation: OperationTypesEnum.TRUE }    // active IS TRUE
{ field: "active", operation: OperationTypesEnum.FALSE }   // active IS FALSE
```

Passing `searchTerm: null` with any other operator is shorthand for `IS NULL`:

```ts
{ field: "deletedAt", searchTerm: null } // deletedAt IS NULL
```

## Validation

Invalid operator/operand combinations throw a descriptive error instead of producing
broken SQL:

- `IN` requires a non-empty array.
- `BETWEEN` requires an array of exactly two elements.
- `LIKE` / `ILIKE` require a string.
- Comparison operators reject array values.
- A leaf must define a `field`.

```ts
getWhere({ field: "n", operation: OperationTypesEnum.IN, searchTerm: 5 });
// throws: "Serafim: IN requires a non-empty array searchTerm."
```
