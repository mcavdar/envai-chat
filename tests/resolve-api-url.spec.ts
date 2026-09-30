import { expect, test } from "@playwright/test";
import { resolveApiUrl } from "../src/lib/resolve-api-url";

test("prefers the configured environment URL", () => {
  expect(resolveApiUrl("https://query.example", "https://env.example")).toBe(
    "https://env.example",
  );
});

test("uses the query URL when no environment URL is configured", () => {
  expect(resolveApiUrl("https://query.example")).toBe("https://query.example");
});

test("returns an empty URL when neither source is configured", () => {
  expect(resolveApiUrl("")).toBe("");
});