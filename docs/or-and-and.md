# OR & AND

Both OR and AND can be used to query custom data:

Using OR & AND:

<pre class="language-javascript"><code class="lang-javascript"><strong>const search: Search = {
</strong>  where: [
    AND(
      {
        field: "storeId",
        operation: OperationTypes.EQUAL,
        value: 1,
      },
      OR(
        AND(
          {
            field: "dateStart",
            operation: OperationTypes.LESS_EQUAL,
            value: '2025-01-01',
          },
          {
            field: "dateEnd",
            operation: OperationTypes.GREATER_EQUAL,
            value: '2025-01-31',
          }
        ),
        AND(
          {
            field: "dateStart",
            operation: OperationTypes.EQUAL,
            value: null,
          },
          {
            field: "dateEnd",
            operation: OperationTypes.EQUAL,
            value: null,
          }
        )
      )
    ),
  ],
};
</code></pre>

is equivalent in TypeORM to (you have to use cartesian products because of [TypeORM's documentation on OR & AND](https://orkhan.gitbook.io/typeorm/docs/find-options)):

```javascript
const where = [
  {
    storeId: 1,
    dateStart: Raw(alias => `${alias} <= '2025-01-01'`),
    dateEnd: Raw(alias => `${alias} >= '2025-01-31'`),
  },
  {
    storeId: 1,
    dateStart: IsNull(),
    dateEnd: IsNull(),
  },
```

will execute following query:

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
