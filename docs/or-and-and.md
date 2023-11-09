# OR & AND

Just like in the [TypeORM docs](https://orkhan.gitbook.io/typeorm/docs/find-options), both OR and AND can be used to query custom data:

Using OR:

```javascript
const search: Search = {
	where: [
		{
			field: "firstName",
			searchTerm: "Timber",
		},
		{
			field: "lastName",
			searchTerm: "Saw",
		},
	]
};
```

will execute following query:

```sql
SELECT * FROM "user"
    WHERE "firstName" = 'Timber' AND
    "lastName" = 'Saw'
```

Using AND:

```javascript
const search: Search = {
	where: [
		[
			{
				field: "firstName",
				searchTerm: "Timber",
			},
			{
				field: "lastName",
				searchTerm: "Saw",
			},
		],
		[
			{
				field: "firstName",
				searchTerm: "Stan",
			},
			{
				field: "lastName",
				searchTerm: "Lee",
			},
		]
	]
};
```

will execute following query:

```sql
SELECT * FROM "user"
    WHERE ("firstName" = 'Timber' AND "lastName" = 'Saw') OR
    ("firstName" = 'Stan' AND "lastName" = 'Lee')
```
