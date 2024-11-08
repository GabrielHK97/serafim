import { getWhere } from ".";

enum Teste {
  ONE = "1",
  TWO = "2",
}

console.log(
  getWhere([
    {
      field: "accountId",
      operation: "EQUAL",
      value: "one",
    },
  ])
);
