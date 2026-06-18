import { describe, it, expect } from "vitest";
import { getRelations, AND, OR, OperationTypesEnum as Op } from "../index";

describe("getRelations", () => {
  it("returns {} for empty / falsy input", () => {
    expect(getRelations(undefined as any)).toEqual({});
    expect(getRelations(null as any)).toEqual({});
  });

  it("throws on a bare array (combine with AND/OR instead)", () => {
    expect(() => getRelations([{ field: "person.id", searchTerm: 1 }] as any)).toThrow(/bare array/);
  });

  it("ignores plain (non-dotted) fields", () => {
    expect(getRelations({ field: "name", searchTerm: "x" })).toEqual({});
  });

  it("derives a single-level relation", () => {
    expect(getRelations({ field: "profilePicture.id", searchTerm: 1 })).toEqual({
      profilePicture: true,
    });
  });

  it("derives a nested relation chain", () => {
    expect(getRelations({ field: "person.address.state", searchTerm: "NY" })).toEqual({
      person: { address: true },
    });
  });

  it("merges relations across an AND of conditions", () => {
    const relations = getRelations(
      AND(
        { field: "person.address.state", searchTerm: "NY" },
        { field: "profilePicture.id", searchTerm: 1 },
        { field: "topLevelColumn", searchTerm: 1 }
      )
    );
    expect(relations).toEqual({
      person: { address: true },
      profilePicture: true,
    });
  });

  it("collects relations across AND / OR nodes", () => {
    const relations = getRelations(
      AND(
        OR(
          { field: "person.name", searchTerm: "a" },
          { field: "person.address.zip", searchTerm: 1 }
        ),
        { field: "profilePicture.path", operation: Op.LIKE, searchTerm: "x" }
      )
    );
    expect(relations).toEqual({
      person: { address: true },
      profilePicture: true,
    });
  });

  it("lets deeper paths win over shallower ones regardless of order", () => {
    const shallowFirst = getRelations(
      AND(
        { field: "person.name", searchTerm: "a" },
        { field: "person.address.zip", searchTerm: 1 }
      )
    );
    const deepFirst = getRelations(
      AND(
        { field: "person.address.zip", searchTerm: 1 },
        { field: "person.name", searchTerm: "a" }
      )
    );
    expect(shallowFirst).toEqual({ person: { address: true } });
    expect(deepFirst).toEqual({ person: { address: true } });
  });

  it("does NOT invent relations from dotted searchTerm values (regression)", () => {
    // "a.b@x.com" is data, not a relation path — it must be ignored.
    expect(getRelations({ field: "email", searchTerm: "a.b@x.com" })).toEqual({});
  });
});
