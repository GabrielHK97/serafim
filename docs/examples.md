# Examples

All examples assume:

```ts
import {
  getWhere, getRelations, getOrder, AND, OR, OperationTypesEnum, SortConstants,
} from "serafim";
```

## Single filter

```ts
const where = { field: "status", searchTerm: "active" };
repo.find({ where: getWhere(where) });
// WHERE status = 'active'
```

## Multiple filters (all must match)

```ts
const where = AND(
  { field: "status", searchTerm: "active" },
  { field: "age", operation: OperationTypesEnum.GREATER_EQUAL, searchTerm: 18 }
);
// WHERE status = 'active' AND age >= 18
```

## Either/or

```ts
const where = OR(
  { field: "role", searchTerm: "admin" },
  { field: "role", searchTerm: "owner" }
);
// WHERE role = 'admin' OR role = 'owner'
```

Tip: for the same field against many values, prefer `IN`:

```ts
const where = { field: "role", operation: OperationTypesEnum.IN, searchTerm: ["admin", "owner"] };
// WHERE role IN ('admin', 'owner')
```

## Text search

```ts
const where = { field: "name", operation: OperationTypesEnum.ILIKE, searchTerm: "jo" };
// WHERE name ILIKE '%jo%'
```

## Ranges and dates

```ts
const where = AND(
  { field: "price", operation: OperationTypesEnum.BETWEEN, searchTerm: [10, 100] },
  { field: "createdAt", operation: OperationTypesEnum.GREATER, searchTerm: new Date("2025-01-01") }
);
// WHERE price BETWEEN 10 AND 100 AND createdAt > '2025-01-01T...'
```

## Null checks

```ts
// not soft-deleted
const active = { field: "deletedAt", operation: OperationTypesEnum.NULL };

// has been verified
const verified = { field: "verifiedAt", operation: OperationTypesEnum.NOT };

// shorthand: searchTerm null == IS NULL
const alsoActive = { field: "deletedAt", searchTerm: null };
```

## Filtering across relations + auto relations

```ts
const where = AND(
  { field: "person.address.state", searchTerm: "NY" },
  { field: "profilePicture.id", operation: OperationTypesEnum.NOT }
);

repo.find({
  relations: getRelations(where), // { person: { address: true }, profilePicture: true }
  where: getWhere(where),
});
```

## Sorting and pagination

```ts
repo.find({
  where: getWhere({ field: "status", searchTerm: "active" }),
  order: getOrder({ field: "person.address.state", sortOrder: SortConstants.DESC }),
  skip: 0,
  take: 20,
});
```

## A complete request shape

```ts
const where = AND(
  { field: "storeId", searchTerm: 1 },
  OR(
    AND(
      { field: "dateStart", operation: OperationTypesEnum.LESS_EQUAL, searchTerm: "2025-01-01" },
      { field: "dateEnd", operation: OperationTypesEnum.GREATER_EQUAL, searchTerm: "2025-01-31" }
    ),
    AND(
      { field: "dateStart", operation: OperationTypesEnum.NULL },
      { field: "dateEnd", operation: OperationTypesEnum.NULL }
    )
  )
);

couponRepository.find({
  relations: getRelations(where),
  where: getWhere(where),
  order: getOrder({ field: "dateStart", sortOrder: SortConstants.ASC }),
});
```

See [AND & OR](./or-and-and.md) for the SQL this produces.
