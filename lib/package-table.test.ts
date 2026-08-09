import assert from "node:assert/strict";
import test from "node:test";
import {
  packageLockStatus,
  selectPackageRows,
  type PackageRow,
  type PackageTableSelection,
} from "./package-table.ts";

function packageRow(name: string, total: number, lockSatisfied: boolean): PackageRow {
  return {
    name,
    owner: "Example",
    ownerId: "example",
    ownerKind: "feature",
    modular: "yes",
    testing: {
      counts: { xctest: total, swiftTesting: 0, total },
      tier: total === 0 ? "none" : total < 10 ? "thin" : total < 30 ? "covered" : "heavy",
      suitePaths: [`Packages/${name}/Tests/${name}Tests`],
      wiredness: "push-or-pull-request",
      wiringEvidencePaths: [".github/workflows/ci.yml"],
      ratchets: [],
      realSurface: { status: "none-detected", commands: [], recordedEvidencePaths: [] },
      lock: {
        satisfied: lockSatisfied,
        suiteRequired: true,
        minimumTestCount: total,
        wirednessRequired: true,
        requiredRatchets: [],
      },
    },
    deps: [],
    dependents: [],
    appStoreGates: [],
    linkedInProject: true,
  };
}

function selection(overrides: Partial<PackageTableSelection> = {}): PackageTableSelection {
  return {
    query: "",
    kinds: new Set(),
    tiers: new Set(),
    locks: new Set(),
    linkedOnly: false,
    gatesOnly: false,
    sort: "name",
    direction: "asc",
    ...overrides,
  };
}

test("packageLockStatus exposes the emitted lock truth", () => {
  assert.equal(packageLockStatus(packageRow("Holding", 12, true)), "holds");
  assert.equal(packageLockStatus(packageRow("Failing", 12, false)), "fails");
});

test("the package table filters lock holds and failures independently", () => {
  const rows = [packageRow("Holding", 12, true), packageRow("Failing", 12, false)];

  assert.deepEqual(
    selectPackageRows(rows, selection({ locks: new Set(["fails"]) })).map((row) => row.name),
    ["Failing"],
  );
  assert.deepEqual(
    selectPackageRows(rows, selection({ locks: new Set(["holds"]) })).map((row) => row.name),
    ["Holding"],
  );
});

test("testing sort uses the derived total declaration count", () => {
  const rows = [packageRow("Large", 30, true), packageRow("Small", 2, true)];
  assert.deepEqual(
    selectPackageRows(rows, selection({ sort: "testing", direction: "asc" })).map((row) => row.name),
    ["Small", "Large"],
  );
});
