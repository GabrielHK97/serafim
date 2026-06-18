# Serafim

### Why Serafim?

Serafim the portuguese word for Seraph. It is also an acronym of **Se**arch **R**equests **A**PI for TypeORM's **Fi**nd **M**ethod.

### What is the purpose of this package?

This package aims to facilitate fetching custom data when using TypeORM, providing an API to make dynamic queries using JSON.

### Instalation

```
npm install --save serafim
```

### ⚠️ Upgrading to 3.0.0 (may be breaking)

`3.0.0` is a major release and **may break existing code**. If you already combined
conditions explicitly with `AND(...)` / `OR(...)` and passed valid inputs, the
generated queries are equivalent and you likely need no changes. Otherwise, review:

- **Bare arrays are no longer accepted.** `getWhere([a, b])` / `getRelations([a, b])`
  now throw. Combine conditions explicitly with `AND(...)` (all must match) or
  `OR(...)` (any may match). A single condition can still be passed on its own.
- **Values are bound as query parameters** (TypeORM's native `Equal`, `In`, `Like`,
  `Between`, … operators) instead of being interpolated into raw SQL. This prevents
  SQL injection; the matched rows are unchanged for valid inputs.
- **Null / boolean operators were cleaned up:** `NULL` / `IS` → `IS NULL`, `NOT` →
  `IS NOT NULL`, `TRUE` / `FALSE` → `IS TRUE` / `IS FALSE`, and a `searchTerm: null`
  is shorthand for `IS NULL`. These operators now ignore `searchTerm`.
- **Invalid inputs throw** instead of producing broken SQL: `IN` requires a non-empty
  array, `BETWEEN` requires exactly two elements, `LIKE` / `ILIKE` require a string.

### Introduction and Usage

Given the following entities and relationships:

```jsx
@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	username: string;

	@Column()
	password: string;

	@OneToOne(() => Person)
	person: Person;

	@OneToOne(() => ProfilePicture)
	profilePicture: ProfilePicture;
}
```

```jsx
@Entity()
export class ProfilePicture {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	path: string;
}
```

```jsx
@Entity()
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	surname: string;

	@OneToOne(() => Address)
	address: Address;
}
```

```jsx
@Entity()
export class Address {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	address: string;

	@Column()
	zip: number;
}
```

To extract custom information, you have to write custom queries, and there are two ways to do that in TypeORM. The first is to write queries using raw SQL, which uses the query method. The second way is to use the find method and specify the params. In both ways one would have to write an API, either to write custom raw SQL, either to customize the params. This package uses the latter, by translating JSON into meaningful params.

Only using TypeORM:

```jsx
//frontend
const search = {
	relations: {
		person: {
			address: true
		},
		profilePicture: true
	},
	where: [
		{
			person: {
				address: {
					state: "NY"
				}
			}
		},
		{
			profilePicture: {
				id: 1
			}
		}
	],
	order: {
		person: {
			address: {
				state: "ASC"
			}
		}
	}
}

//backend
userRepository.find({
	relations: search.relations,
	where: search.where,
	order: search.order,
})
```

Using Serafim:

```jsx
//frontend
import { OR } from "serafim";

const search: Search = {
	where: OR(
		{
			field: "person.address.state",
			searchTerm: "NY",
		},
		{
			field: "profilePicture.id",
			searchTerm: 1
		}
	),
	order: {
		field: "person.address.state",
		sortOrder: "ASC",
	}
};

//backend
userRepository.find({
	relations: getRelations(search.where), // search.where, not search.relations
	where: getWhere(search.where),
	order: getOrder(search.order),
})
```

Conditions are never combined implicitly: pass a single condition, or group them
explicitly with `AND(...)` / `OR(...)`. Passing a bare array throws.

With pure TypeORM, you need to know in advance what relations will be used in order to fetch custom data, whereas with Serafim, you just type what you need to fetch. With Serafim it is much easier as you can see!

### Combining conditions (AND / OR)

A bare array of conditions is implicit **AND** — every condition is merged together.
For disjunctions, use the `OR` helper; both `AND` and `OR` are first-class combinators
that can be nested arbitrarily:

```jsx
import { AND, OR, getWhere } from "serafim";

const where = AND(
	{ field: "person.address.state", searchTerm: "NY" },
	OR(
		{ field: "profilePicture.id", searchTerm: 1 },
		{ field: "profilePicture.id", searchTerm: 2 }
	)
);

userRepository.find({
	relations: getRelations(where),
	where: getWhere(where),
});
```

`getWhere` returns `{}` for empty input, a single condition object when there is one
result, or an array of objects (an OR set) for multiple results. `getRelations` derives
the `relations` tree from the `field` paths referenced anywhere in the expression.

### Documentation

[Docs](https://serafim.gabrielhk.dev/)

### Donations

Don't feel obligated. This package is FREE!

[☕️ buy me a coffee](https://ko-fi.com/gabrielhk97)
