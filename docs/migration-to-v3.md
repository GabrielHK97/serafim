# Migrating to v3

`3.0.0` is a major release. If you already combined conditions with `AND(...)` /
`OR(...)` and passed valid inputs, the generated queries are equivalent and you likely
need no changes. Otherwise, review the breaking changes below.

## 1. Bare arrays are no longer accepted

In 2.x you could pass an array of conditions directly. In 3.x this throws — combine
conditions explicitly.

```ts
// 2.x
getWhere([
  { field: "a", searchTerm: 1 },
  { field: "b", searchTerm: 2 },
]);

// 3.x — all must match
getWhere(AND(
  { field: "a", searchTerm: 1 },
  { field: "b", searchTerm: 2 }
));

// 3.x — any may match
getWhere(OR(
  { field: "a", searchTerm: 1 },
  { field: "b", searchTerm: 2 }
));
```

This also applies to `getRelations`. A single condition can still be passed on its
own, and `undefined` / `null` / `{}` still mean "no conditions".

The `WhereInput` type no longer includes `WhereExpression[]`, and the
`WhereExpressionArray` type export was removed.

## 2. Values are bound as parameters (injection-safe)

Conditions now use TypeORM's native operators (`Equal`, `MoreThan`, `In`, `Between`,
`Like`, `ILike`, …) instead of hand-built `Raw` SQL. User input is bound as a query
parameter and never concatenated into SQL.

- **Behavioral impact:** for valid inputs, the rows returned are unchanged.
- **If you inspected the output objects directly**, the operator types differ (e.g.
  `Equal(5)` instead of `Raw(alias => \`${alias} = 5\`)`). Use the operators rather
  than asserting on raw SQL strings.

## 3. Cleaner null / boolean operator semantics

| Operator | 2.x behavior | 3.x behavior |
| --- | --- | --- |
| `NULL` / `IS` | required `searchTerm: "NULL"` to emit `IS NULL` | `IS NULL` (ignores `searchTerm`) |
| `NOT` | emitted invalid `col NOT 'value'` | `IS NOT NULL` |
| `TRUE` / `FALSE` | required matching `searchTerm` string | `IS TRUE` / `IS FALSE` (ignores `searchTerm`) |
| `searchTerm: null` | `IS NULL` | `IS NULL` (unchanged) |

If you used the old `operation: IS, searchTerm: "NULL"` pattern, switch to
`operation: NULL` (or simply `searchTerm: null`).

## 4. Invalid inputs throw

Previously some bad inputs produced broken SQL silently. They now throw:

- `IN` requires a non-empty array.
- `BETWEEN` requires an array of exactly two elements.
- `LIKE` / `ILIKE` require a string.
- Comparison operators reject array values.
- A leaf must define a `field`.

Validate user input (or wrap `getWhere` in a try/catch) where requests come from
untrusted clients.

## 5. Booleans

A boolean `searchTerm` with the default `EQUAL` is now a parameterized `Equal(true)`
instead of being passed through as a raw value. No action needed; behavior is
equivalent.

## Quick checklist

- [ ] Replace bare arrays with `AND(...)` / `OR(...)`.
- [ ] Replace `operation: IS, searchTerm: "NULL"` with `operation: NULL`.
- [ ] Ensure `IN` / `BETWEEN` receive correctly shaped arrays.
- [ ] Remove any code that asserted on the old `Raw` SQL output shape.
- [ ] Drop usage of the removed `WhereExpressionArray` type.
