# Core concepts

## The `Where` leaf

The smallest building block is a **condition** (a `Where` leaf):

```ts
interface Where {
  field?: string;                  // dotted path, e.g. "person.address.state"
  operation?: OperationTypesEnum;  // defaults to EQUAL
  searchTerm?: any;                // the value to match (bound as a parameter)
}
```

- **`field`** is a dot-delimited path. `"person.address.state"` targets the `state`
  column on the `address` relation of the `person` relation. The path is also what
  `getRelations` uses to decide which relations to load.
- **`operation`** is one of the [operators](./operators.md). If omitted it is `EQUAL`.
- **`searchTerm`** is the value. It is always bound as a query parameter, never
  inlined into SQL.

```ts
getWhere({ field: "person.address.state", searchTerm: "NY" });
// { person: { address: { state: Equal("NY") } } }
```

## Combining conditions: `AND` and `OR`

`AND` and `OR` take any number of conditions (leaves or other `AND` / `OR` groups)
and can be nested arbitrarily.

```ts
import { AND, OR } from "serafim";

// every condition must match
AND(a, b, c);

// any condition may match
OR(a, b, c);

// nest freely
AND(a, OR(b, c));
```

- `getWhere(AND(...))` merges everything into a **single object** (logical AND).
- `getWhere(OR(...))` returns an **array of objects** — TypeORM treats a top-level
  array as OR.
- Mixing them distributes correctly. `AND(OR(a, b), c)` becomes
  `[{...a, ...c}, {...b, ...c}]`, the cartesian product TypeORM's find API requires.

See [AND & OR](./or-and-and.md) for a worked example with the resulting SQL.

## No implicit combination (important in 3.x)

A bare array is **not** a valid expression and throws:

```ts
getWhere([a, b]); // ❌ Error: a bare array is not a valid where expression...
```

This removes the old ambiguity (was a bare array AND or OR?). Always say what you
mean with `AND(...)` or `OR(...)`. A single condition can still be passed on its own.

## `Search`, `Order` and `FindParams`

`Search` is a convenience container that pairs a where expression with an order:

```ts
class Search {
  where?: WhereExpression; // pass to getWhere / getRelations
  order?: Order;           // pass to getOrder
}
```

`Order` describes a single sort target:

```ts
class Order {
  field?: string;     // dotted path, like a Where field
  sortOrder?: string; // "ASC" | "DESC" | SortConstants.*
}

getOrder({ field: "person.address.state", sortOrder: "ASC" });
// { person: { address: { state: "ASC" } } }
```

`FindParams` is an optional shape for pagination alongside a search:

```ts
class FindParams {
  search?: Search;
  skip?: number;
  take?: number;
}
```

## How values become SQL

Serafim never builds SQL strings from your data. Each `searchTerm` is wrapped in a
TypeORM operator that binds the value as a parameter:

| You write | Serafim produces | TypeORM runs (parameterized) |
| --- | --- | --- |
| `{ field: "n", searchTerm: 5 }` | `{ n: Equal(5) }` | `n = $1` |
| `{ field: "n", operation: IN, searchTerm: [1, 2] }` | `{ n: In([1, 2]) }` | `n IN ($1, $2)` |
| `{ field: "name", operation: ILIKE, searchTerm: "ab" }` | `{ name: ILike("%ab%") }` | `name ILIKE $1` |

This is what makes Serafim safe against SQL injection — see
[Operators → SQL injection safety](./operators.md#sql-injection-safety).

Next: [Operators](./operators.md).
