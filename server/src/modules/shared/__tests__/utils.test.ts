import { describe, it, expect } from "vitest";
import { normalizePhone } from "../utils.js";

describe("normalizePhone", () => {
  it("turns a local Serbian number into +381 without the leading zero", () => {
    expect(normalizePhone("0691822652")).toBe("+381691822652");
    expect(normalizePhone("021 123 456")).toBe("+38121123456");
    expect(normalizePhone("064/111-22-33")).toBe("+381641112233");
  });

  it("keeps an international number and removes spaces", () => {
    expect(normalizePhone("+381605511106")).toBe("+381605511106");
    expect(normalizePhone(" +381 60 551 1106 ")).toBe("+381605511106");
  });

  it("turns 00381 and 381 into +381", () => {
    expect(normalizePhone("00381605511106")).toBe("+381605511106");
    expect(normalizePhone("381605511106")).toBe("+381605511106");
  });

  it("returns unknown shapes as written and empty values as undefined", () => {
    expect(normalizePhone("pozovite agenciju")).toBe("pozovite agenciju");
    expect(normalizePhone("12345")).toBe("12345");
    expect(normalizePhone("   ")).toBeUndefined();
    expect(normalizePhone(null)).toBeUndefined();
  });
});
