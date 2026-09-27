import { expect, test } from "bun:test";
import { searchContacts } from "./directory";

const names = (query: string) => searchContacts(query).map((c) => c.name);

test("a team name returns everyone on that team", () => {
    expect(names("design")).toEqual(["Sujoy", "John"]);
});

test("a person's name returns just that person", () => {
    expect(names("kevin")).toEqual(["Kevin"]);
});

test("matching ignores case and surrounding whitespace", () => {
    expect(names("  SUJOY ")).toEqual(["Sujoy"]);
});

test("an email address finds its owner", () => {
    expect(names("john@codersgyan.com")).toEqual(["John"]);
});

test("an unknown query returns nothing rather than everyone", () => {
    // The agent has to be able to say "no such contact". If an unknown query
    // fell back to the full list, it would email the wrong people.
    expect(names("marketing")).toEqual([]);
});

test("an empty query lists the whole directory", () => {
    expect(names("")).toHaveLength(3);
});
