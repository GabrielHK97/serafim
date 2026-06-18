# API reference

All exports come from the package root:

```ts
import {
  // functions
  getWhere, getRelations, getOrder, AND, OR,
  // classes
  Search, Where, Order, FindParams,
  // enums
  OperationTypesEnum, VarTypesEnum, SortConstants,
  // types
  WhereExpression, WhereInput,
} from "serafim";
```

## Functions

### `getWhere(expression): object | object[]`

Translates a where expression into TypeORM `find` `where` params.

- **Parameter** — `expression: WhereExpression` — a single condition, or an
  `AND(...)` / `OR(...)` group. `undefined` / `null` are allowed.
- **Returns**
  - `{}` when the expression is empty (`undefined`, `null`, empty `AND()` / `OR()`).
  - a single condition object when the expression resolves to one condition.
  - an array of condition objects (an OR set) when `OR(...)` yields multiple results.
- **Throws** when passed a bare array, when a leaf has no `field`, or when an
  operator/operand combination is invalid (see [Operators](./operators.md)).

```ts
getWhere({ field: "id", searchTerm: 1 });          // { id: Equal(1) }
getWhere(AND(a, b));                                 // { ...a, ...b }
getWhere(OR(a, b));                                  // [ a, b ]
getWhere(undefined);                                 // {}
```

### `getRelations(expression): object`

Derives the TypeORM `relations` object from the dotted `field` paths used anywhere in
the expression. A field `"person.address.state"` loads the `person.address` relation
chain; a plain field (no dot) contributes nothing.

```ts
getRelations(AND(
  { field: "person.address.state", searchTerm: "NY" },
  { field: "username", searchTerm: "gab" }
));
// { person: { address: true } }
```

Only `field` paths are inspected — `searchTerm` values are never interpreted as
relations. Accepts the same input as `getWhere` and throws on a bare array.

### `getOrder(order?): object`

Translates an `Order` into a TypeORM `find` `order` param.

```ts
getOrder({ field: "person.address.state", sortOrder: "ASC" });
// { person: { address: { state: "ASC" } } }

getOrder();                       // {}
getOrder({ sortOrder: "ASC" });   // {} (no field)
```

### `AND(...conditions): WhereExpression`

Groups conditions conjunctively. Returns `{ $and: conditions }`. Accepts leaves and
nested `AND` / `OR` groups.

### `OR(...conditions): WhereExpression`

Groups conditions disjunctively. Returns `{ $or: conditions }`.

## Classes

### `Where`

```ts
class Where {
  field?: string;
  operation?: OperationTypesEnum; // default: EQUAL
  searchTerm?: any;               // default: ""
  constructor(field?, operation?, searchTerm?);
}
```

### `Order`

```ts
class Order {
  field?: string;     // default: ""
  sortOrder?: string; // default: SortConstants.UNSORTED
  constructor(field?, sortOrder?);
}
```

### `Search`

```ts
class Search {
  where?: WhereExpression;
  order?: Order;
  constructor(where?, order?);
}
```

### `FindParams`

```ts
class FindParams {
  search?: Search;
  skip?: number;
  take?: number;
}
```

## Enums

### `OperationTypesEnum`

| Member | Value |
| --- | --- |
| `EQUAL` | `"="` |
| `NOT_EQUAL` | `"!="` |
| `GREATER` | `">"` |
| `GREATER_EQUAL` | `">="` |
| `LESS` | `"<"` |
| `LESS_EQUAL` | `"<="` |
| `LIKE` | `"LIKE"` |
| `ILIKE` | `"ILIKE"` |
| `IN` | `"IN"` |
| `BETWEEN` | `"BETWEEN"` |
| `NULL` | `"NULL"` |
| `IS` | `"IS"` |
| `NOT` | `"NOT"` |
| `TRUE` | `"TRUE"` |
| `FALSE` | `"FALSE"` |

See [Operators](./operators.md) for the SQL each produces.

### `SortConstants`

| Member | Value |
| --- | --- |
| `UNSORTED` | `"unsorted"` |
| `ASC` | `"asc"` |
| `DESC` | `"desc"` |

`getOrder` also accepts the raw strings `"ASC"` / `"DESC"` that TypeORM understands.

### `VarTypesEnum`

A helper enum of value-type names (`STRING`, `DATE`, `NUMBER`, `BIGINT`, `OBJECT`).
Exported for backwards compatibility; not required for normal use.

## Types

```ts
type WhereExpression =
  | Where
  | { $and: WhereExpression[] }
  | { $or: WhereExpression[] };

type WhereInput = WhereExpression; // accepted by getWhere / getRelations
```

> In 2.x, `WhereInput` also allowed a bare `WhereExpression[]`. That is removed in
> 3.x — use `AND(...)` / `OR(...)`.
