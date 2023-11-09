# Operators

### Operators available

There are a bunch of operators that can be used to further customize the search. They are all included in the OperationTypes enum.

| Dyfono         | SQL             |
| -------------- | --------------- |
| EQUAL          | =               |
| NOT\_EQUAL     | !=              |
| GREATER        | >               |
| GREATER\_EQUAL | >=              |
| LESS           | <               |
| LESS\_EQUAL    | <=              |
| ILIKE          | ILIKE           |
| LIKE           | LIKE            |
| IN             | IN [n1, n2, ...]|
| NOT            | NOT             |
| BETWEEN        | BETWEEN x AND y |
| NULL           | NULL            |
| TRUE           | TRUE            |
| FALSE          | FALSE           |

If no operator is specified, the default is EQUAL:

```javascript
const search1: Search = {
	where: [
		{
			field: "quantity",
			searchTerm: 10,
		},
	]
};
const search2: Search = {
	where: [
		{
			field: "quantity",
			operator: OperationTypes.EQUAL
			searchTerm: 10,
		},
	]
};
// search1 and search2 are equivalent
```

With other operators:

```javascript
const search: Search = {
	where: [
		{
			field: "quantity",
			operation: OperationTypes.GREATER
			searchTerm: 5,
		},
	]
};
```
The searchTerm can be a number, a string or an array. It becomes an array when the operator **BETWEEN** or **IN** is used:

```javascript
const search1: Search = {
	where: [
		{
			field: "quantity",
			operation: OperationTypes.BETWEEN
			searchTerm: [10, 20],
		},
	]
};
const search: Search = {
	where: [
		{
			field: "quantity",
			operation: OperationTypes.IN
			searchTerm: [10, 20, 30, 40],
		},
	]
};
```
