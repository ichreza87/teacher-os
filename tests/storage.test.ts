import { describe, expect, it } from "vitest";
import { buildKey, safeFilename, StorageUnconfiguredError } from "@/integrations/storage/types";
import { getStorageBackend } from "@/integrations/storage/factory";
import { isS3Configured } from "@/integrations/storage/s3";

describe("storage keys", () => {
  it("builds safe namespaced keys", () => {
    const k = buildKey("user-1", "knowledge", "RPP IPA Bab 1.pdf", "abc", new Date("2026-09-01T00:00:00Z"));
    expect(k).toBe("teacher-os/user-1/knowledge/202609/abc-RPP_IPA_Bab_1.pdf");
  });

  it("strips directory segments to prevent traversal", () => {
    const k = buildKey("user-1", "knowledge", "../../etc/passwd", "abc", new Date("2026-09-01T00:00:00Z"));
    expect(k).toBe("teacher-os/user-1/knowledge/202609/abc-passwd");
  });

  it("sanitizes filenames", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("")).toBe("file");
  });
});

describe("backend selection", () => {
  it("prefers S3 when configured", () => {
    const env = {
      S3_ENDPOINT: "https://s3.example",
      S3_ACCESS_KEY: "a",
      S3_SECRET_KEY: "b",
      S3_BUCKET: "c",
    };
    expect(isS3Configured(env)).toBe(true);
    expect(getStorageBackend(undefined, env).name).toBe("s3");
  });

  it("throws honestly when nothing is configured", () => {
    expect(() => getStorageBackend(undefined, {})).toThrow(StorageUnconfiguredError);
  });
});
