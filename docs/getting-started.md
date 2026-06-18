# Getting started

## Installation

```bash
npm install --save serafim
```

Serafim has a single peer-relevant dependency, `typeorm` (`^0.3.x`), which you already
have in a TypeORM project.

## The idea

A TypeORM `find` call needs three things: which rows to match (`where`), which
relations to load (`relations`), and how to sort (`order`). Serafim builds all three
from a compact, serializable description, so the shape of the query can come from the
client.

Serafim exposes three translation functions:

| Function | Input | Output (for `repository.find`) |
| --- | --- | --- |
| `getWhere(expression)` | a where expression | `where` |
| `getRelations(expression)` | the same where expression | `relations` |
| `getOrder(order)` | an `Order` | `order` |

## Your first query

Given a `User` entity related to `Person → Address` and to `ProfilePicture`:

```ts
import {
  getWhere,
  getRelations,
  getOrder,
  AND,
  OperationTypesEnum,
} from "serafim";

// Built on the client, sent as JSON, rebuilt on the server.
const where = AND(
  { field: "person.address.state", searchTerm: "NY" },
  { field: "username", operation: OperationTypesEnum.ILIKE, searchTerm: "gab" }
);

const users = await userRepository.find({
  relations: getRelations(where), // { person: { address: true } }
  where: getWhere(where),
  order: getOrder({ field: "person.address.state", sortOrder: "ASC" }),
  skip: 0,
  take: 20,
});
```

`getRelations` reads the dotted `field` paths and figures out which relations must be
loaded — you don't list them by hand.

## A single condition

You don't need `AND` / `OR` for one condition — pass it directly:

```ts
getWhere({ field: "quantity", searchTerm: 10 });
// equivalent to: { quantity: Equal(10) }
```

## No implicit combination

In 3.x, **a bare array is not a valid where expression**. Combine conditions
explicitly:

```ts
// ❌ throws: "a bare array is not a valid where expression..."
getWhere([
  { field: "a", searchTerm: 1 },
  { field: "b", searchTerm: 2 },
]);

// ✅ all must match
getWhere(AND({ field: "a", searchTerm: 1 }, { field: "b", searchTerm: 2 }));

// ✅ any may match
getWhere(OR({ field: "a", searchTerm: 1 }, { field: "b", searchTerm: 2 }));
```

Next: [Core concepts](./core-concepts.md).
