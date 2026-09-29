import { describe, expect, it } from "vitest";
import {
  checkDemoCredentials,
  signDemoToken,
  timeGreeting,
  verifyDemoToken,
} from "@/lib/demo";
import { DEMO_CHART, DEMO_SCHEDULE, DEMO_STATS, DEMO_TASKS } from "@/lib/demo-data";

describe("demo session", () => {
  it("signs and verifies tokens", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signDemoToken("admin", exp);
    expect(verifyDemoToken(token)).toEqual({ user: "admin" });
  });

  it("rejects forged and expired tokens", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signDemoToken("admin", exp);
    expect(verifyDemoToken(token.slice(0, -2) + "ff")).toBeNull();
    expect(verifyDemoToken(signDemoToken("admin", 1))).toBeNull();
    expect(verifyDemoToken("garbage")).toBeNull();
  });

  it("checks trial credentials", () => {
    expect(checkDemoCredentials("admin", "admin")).toBe(true);
    expect(checkDemoCredentials("admin", "salah")).toBe(false);
    expect(checkDemoCredentials("root", "admin")).toBe(false);
  });
});

describe("time greeting", () => {
  it("greets by hour", () => {
    expect(timeGreeting(8)).toBe("Selamat pagi");
    expect(timeGreeting(12)).toBe("Selamat siang");
    expect(timeGreeting(16)).toBe("Selamat sore");
    expect(timeGreeting(21)).toBe("Selamat malam");
  });
});

describe("demo dataset", () => {
  it("matches the reference layout", () => {
    expect(DEMO_STATS).toHaveLength(4);
    expect(DEMO_SCHEDULE).toHaveLength(4);
    expect(DEMO_TASKS).toHaveLength(4);
    expect(DEMO_CHART.length).toBeGreaterThanOrEqual(6);
  });
});
