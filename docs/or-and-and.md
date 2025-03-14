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
