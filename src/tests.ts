import { getWhere } from ".";
import { Where } from "./classes/where.class";
console.log(
  getWhere([
    {
      field: "debt.yourNumber",
      operation: "ILIKE",
      value: "%123%",
    },
    {
      field: "accountId",
      operation: "EQUAL",
      value: "e3c6e38c-d987-4ac0-ab9d-de24e1e0cebd",
    },
  ])
);
