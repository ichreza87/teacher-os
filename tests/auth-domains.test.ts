import { describe, expect, it } from "vitest";
import { getAllowedDomains, isAllowedEmail } from "@/lib/auth-domains";

describe("login domain allowlist", () => {
  it("defaults to belajar.id", () => {
    expect(getAllowedDomains({} as unknown as NodeJS.ProcessEnv)).toEqual(["belajar.id"]);
  });

  it("parses comma list", () => {
    expect(getAllowedDomains({ ALLOWED_LOGIN_DOMAINS: "belajar.id, sekolah.sch.id " } as unknown as NodeJS.ProcessEnv))
      .toEqual(["belajar.id", "sekolah.sch.id"]);
  });

  it("accepts belajar.id subdomains", () => {
    expect(isAllowedEmail("guru@guru.sma.belajar.id")).toBe(true);
    expect(isAllowedEmail("guru@guru.sd.belajar.id")).toBe(true);
    expect(isAllowedEmail("GURU@GURU.SMA.BELAJAR.ID")).toBe(true);
  });

  it("rejects other domains and lookalikes", () => {
    expect(isAllowedEmail("guru@gmail.com")).toBe(false);
    expect(isAllowedEmail("guru@belajar.id.palsu.com")).toBe(false);
    expect(isAllowedEmail("bukan-email")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });

  it("respects custom allowlist", () => {
    expect(isAllowedEmail("guru@gmail.com", ["gmail.com"])).toBe(true);
    expect(isAllowedEmail("guru@guru.sma.belajar.id", ["gmail.com"])).toBe(false);
  });
});
