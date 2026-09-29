import { describe, expect, it } from "vitest";
import {
  buildResetSql,
  discoverMigrations,
  parseEnv,
  requireResetConfirmation,
} from "../scripts/lib.mjs";

describe("env parser", () => {
  it("parses keys, quotes, and comments", () => {
    const out = parseEnv('# komen\nA=1\nB="x y"\nC=\'z\'\nEMPTY=\nNOEQ\n');
    expect(out).toEqual({ A: "1", B: "x y", C: "z", EMPTY: "" });
  });
});

describe("migration discovery", () => {
  it("sorts sql files only", () => {
    expect(discoverMigrations(["0003_x.sql", "README.md", "0001_a.sql", "0002_b.sql"])).toEqual([
      "0001_a.sql",
      "0002_b.sql",
      "0003_x.sql",
    ]);
  });
});

describe("reset guard", () => {
  it("refuses without --yes", () => {
    expect(() => requireResetConfirmation([])).toThrow();
    expect(() => requireResetConfirmation(["--yes"])).not.toThrow();
  });

  it("reset sql drops all tables with cascade", () => {
    const sql = buildResetSql();
    for (const t of ["students", "assessments", "knowledge_chunks", "workflow_runs", "schema_migrations"]) {
      expect(sql).toContain(`drop table if exists ${t} cascade;`);
    }
    expect(sql).toContain("match_knowledge_chunks");
  });
});
