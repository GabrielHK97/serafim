# Dyfono

### Why Dyfono?

Dyfono is a word play of the word "Dífono", which in portuguese means: A letter with two sounds. It is also an acronym of **Dy**namic **F**ind **O**ptions **No**tation. Just like a letter with two sounds, the object Search has two objects, Where and Order.

### What is the purpose of this package?

This package aims to facilitate find options for TypeORM. It is a frontend and backend API to make dynamic queries using custom notation.

### Instalation

```
npm install --save dyfono
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

To extract custom information, you have to write custom queries, and there are two ways to do that in TypeORM. The first is to write queries using raw SQL, which uses the query method. The other way is to use the find method and specify the params. In both ways you would have to write an API, either to write custom raw SQL, either to customize the params. This package is an API that customizes the params of the find method, but in a easier way.

Only using TypeORM:

```jsx
//backend
userRepository.find({
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
})
```

Using Dyfono:

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

With pure TypeORM, you need to know in advance what relations will be used in the search, whereas with Dyfono, you just type what you need to search. Plus, with only TypeORM, you would have to find a way to translate the params of your search in the frontend to a compatible find medthod param object in the backend. With Dyfono it is much easier as you can see, it provides an API in the frontend and in the backend!

### Documentation

[Docs](https://dyfono.gabrielhk.dev/)

### Donations

Don't feel obligated. This package is FREE!

[☕️ buy me a coffee](https://ko-fi.com/gabrielhk97)
