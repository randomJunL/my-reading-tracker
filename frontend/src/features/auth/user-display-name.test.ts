import { describe, expect, it } from "vitest";

import { getUserFirstName } from "./user-display-name";

describe("getUserFirstName", () => {
  it("uses the first name from the account metadata", () => {
    expect(getUserFirstName("June Liu", "jl19bo@example.com")).toBe("June");
  });

  it("ignores extra whitespace around the name", () => {
    expect(getUserFirstName("  June   Liu  ", "jl19bo@example.com")).toBe(
      "June",
    );
  });

  it("falls back to the email name when a full name is unavailable", () => {
    expect(getUserFirstName(undefined, "jl19bo@example.com")).toBe("jl19bo");
  });

  it("uses a friendly default when neither value is available", () => {
    expect(getUserFirstName(undefined)).toBe("Reader");
  });
});
