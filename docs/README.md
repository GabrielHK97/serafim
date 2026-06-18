# Serafim v3.x Documentation

**Se**arch **R**equests **A**PI for TypeORM's **Fi**nd **M**ethod.

Serafim turns a small, JSON-friendly notation into the `where`, `relations` and
`order` parameters that TypeORM's `find` method expects — so a frontend can describe
*what* to fetch without the backend knowing the query shape in advance.

```ts
import { getWhere, getRelations, getOrder, AND, OperationTypesEnum } from "serafim";

const where = AND(
  { field: "person.address.state", searchTerm: "NY" },
  { field: "age", operation: OperationTypesEnum.GREATER_EQUAL, searchTerm: 18 }
);

userRepository.find({
  relations: getRelations(where), // { person: { address: true } }
  where: getWhere(where),         // parameterized TypeORM conditions
  order: getOrder({ field: "person.address.state", sortOrder: "ASC" }),
});
```

## Contents

- [Getting started](./getting-started.md) — install and a first query.
- [Core concepts](./core-concepts.md) — `Search`, `Where`, conditions, and how
  `AND` / `OR` combine them.
- [Operators](./operators.md) — every operator, the SQL it produces, and the
  `searchTerm` each one expects.
- [AND & OR](./or-and-and.md) — combining conditions and how they map to TypeORM.
- [API reference](./api-reference.md) — functions, classes, enums and types.
- [Examples](./examples.md) — common recipes.
- [Migrating to v3](./migration-to-v3.md) — what changed from 2.x and how to update.

## What's new in 3.x

- **Injection-safe by design.** Every `searchTerm` is bound as a query parameter via
  TypeORM's native operators (`Equal`, `In`, `Like`, `Between`, …) — never
  concatenated into raw SQL.
- **Explicit combination only.** Conditions are combined with `AND(...)` / `OR(...)`.
  Bare arrays are no longer accepted and throw a descriptive error.
- **Clean operator semantics.** `NULL` / `IS` → `IS NULL`, `NOT` → `IS NOT NULL`,
  `TRUE` / `FALSE` → `IS TRUE` / `IS FALSE`, and invalid inputs (e.g. `IN` without an
  array) throw instead of producing broken SQL.

See [Migrating to v3](./migration-to-v3.md) for the full list.
