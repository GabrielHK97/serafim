# Serafim

### Why Serafim?

Serafim the portuguese word for Seraph. It is also an acronym of **Se**arch **R**equests **A**PI for TypeORM's **Fi**nd **M**ethod.

### What is the purpose of this package?

This package aims to facilitate fetching custom data when using TypeORM, providing an API to make dynamic queries using JSON.

### Instalation

```
npm install --save serafim
```

### Introduction and Usage

Given the following entities and relationships:

```jsx
@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({type: 'varchar'})
	username: string;

	@Column({type: 'varchar'})
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
}
```

```jsx
@Entity()
export class Person {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({type: 'varchar'})
	name: string;

	@Column({type: 'varchar'})
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

	@Column({type: 'varchar'})
	address: string;

	@Column({type: 'int'})
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
const search: Search = {
	where: [
		{
			field: "person.address.state",
			searchTerm: "NY",
		},
		{
			field: "profilePicture.id",
			searchTerm: 1
		}
	],
	order: {
		field: "person.address.state",
		sortOrder: "ASC",
	}
};

//backend
userRepository.find({
	relations: getRelations(search.where), // search.where, not search.relations
	where: getWheres(search.where),
	order: getOrders(search.order),
})
```

With pure TypeORM, you need to know in advance what relations will be used in order to fetch custom data, whereas with Serafim, you just type what you need to fetch. With Serafim it is much easier as you can see!

### Documentation

[Docs](https://serafim.gabrielhk.dev/)

### Donations

Don't feel obligated. This package is FREE!

[☕️ buy me a coffee](https://ko-fi.com/gabrielhk97)
