import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { scrubProps, track } from "@/lib/analytics";

describe("secret crypto", () => {
  const OLD = process.env.APP_ENCRYPTION_KEY;
  afterEach(() => {
    process.env.APP_ENCRYPTION_KEY = OLD;
  });

  it("roundtrips", () => {
    process.env.APP_ENCRYPTION_KEY = "test-key-123";
    const sealed = encryptSecret("oauth-token-abc");
    expect(sealed.ciphertext).not.toContain("oauth-token-abc");
    expect(decryptSecret(sealed)).toBe("oauth-token-abc");
  });

  it("throws without key", () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow();
  });

  it("tampered ciphertext fails", () => {
    process.env.APP_ENCRYPTION_KEY = "test-key-123";
    const sealed = encryptSecret("secret");
    const bad = { ...sealed, ciphertext: sealed.ciphertext.slice(0, -2) + "ff" };
    expect(() => decryptSecret(bad)).toThrow();
  });
});

describe("analytics", () => {
  it("scrubs sensitive props", () => {
    const out = scrubProps({
      full_name: "Siswa X",
      nisn: "123",
      score: 90,
      module: "planning",
      count: 3,
      nested: { a: 1 },
    });
    expect(out).toEqual({ module: "planning", count: 3 });
  });

  it("truncates long strings", () => {
    expect(scrubProps({ note: "a".repeat(500) }).note).toHaveLength(200);
  });

  it("no-ops without key and never throws", () => {
    delete process.env.POSTHOG_KEY;
    expect(track("user-1", "test_event", { full_name: "X" })).toBe(false);
  });
});
