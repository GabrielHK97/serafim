# AND & OR

`AND` and `OR` combine conditions and can be nested arbitrarily. In 3.x they are the
**only** way to combine conditions — a bare array throws.

## Example

```ts
import { AND, OR, OperationTypesEnum, getWhere } from "serafim";

const where = AND(
  {
    field: "storeId",
    operation: OperationTypesEnum.EQUAL,
    searchTerm: 1,
  },
  OR(
    AND(
      {
        field: "dateStart",
        operation: OperationTypesEnum.LESS_EQUAL,
        searchTerm: "2025-01-01",
      },
      {
        field: "dateEnd",
        operation: OperationTypesEnum.GREATER_EQUAL,
        searchTerm: "2025-01-31",
      }
    ),
    AND(
      { field: "dateStart", operation: OperationTypesEnum.NULL },
      { field: "dateEnd", operation: OperationTypesEnum.NULL }
    )
  )
);

couponRepository.find({ where: getWhere(where) });
```

> Note: the `where` is the `AND(...)` expression **directly** — do not wrap it in an
> array. In 2.x this example used `where: [ AND(...) ]`; that now throws.

## How it maps to TypeORM

`getWhere(where)` distributes the `AND` over the inner `OR` (the cartesian product
that TypeORM's find API requires), producing an OR array of two AND objects:

```ts
const where = [
  {
    storeId: Equal(1),
    dateStart: LessThanOrEqual("2025-01-01"),
    dateEnd: MoreThanOrEqual("2025-01-31"),
  },
  {
    storeId: Equal(1),
    dateStart: IsNull(),
    dateEnd: IsNull(),
  },
];
```

See [TypeORM's documentation on OR & AND](https://orkhan.gitbook.io/typeorm/docs/find-options)
for why the cartesian form is needed.

## Resulting SQL

All values are bound as parameters; the literals below are shown for readability only.

```sql
SELECT *
FROM coupon
WHERE storeId = 1
  AND (
    (
      dateStart <= '2025-01-01'
      AND dateEnd >= '2025-01-31'
    )
    OR (
      dateStart IS NULL
      AND dateEnd IS NULL
    )
  );
```
