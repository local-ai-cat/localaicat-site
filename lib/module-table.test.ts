import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyModuleFilters,
  filterModuleRows,
  sortModuleRows,
  type ModuleTableRow
} from "./module-table.ts";

const rows: ModuleTableRow[] = [
  {
    id: "stable",
    name: "Stable module",
    description: "Stable",
    channels: ["main", "beta"],
    platforms: ["macOS"],
    distributions: ["outdoor"],
    status: "live",
    modular: "yes",
    testingTier: "heavy",
    testingCases: 40
  },
  {
    id: "parked",
    name: "Parked module",
    description: "Parked",
    channels: ["none"],
    platforms: ["macOS"],
    distributions: ["none"],
    status: "purgatory",
    modular: "partial",
    testingTier: "thin",
    testingCases: 4
  },
  {
    id: "beta",
    name: "Beta module",
    description: "Beta",
    channels: ["alpha", "beta"],
    platforms: ["iOS", "macOS"],
    distributions: ["indoor"],
    status: "beta",
    modular: "no",
    testingTier: "covered",
    testingCases: 18
  }
];

test("filters use OR within a facet and AND across facets", () => {
  const filters = emptyModuleFilters();
  filters.channels = new Set(["main", "alpha"]);
  filters.platforms = new Set(["iOS"]);

  assert.deepEqual(filterModuleRows(rows, filters).map((row) => row.id), ["beta"]);
});

test("empty filters keep every row", () => {
  assert.deepEqual(filterModuleRows(rows, emptyModuleFilters()), rows);
});

test("sorts semantic status and testing tiers in either direction", () => {
  assert.deepEqual(
    sortModuleRows(rows, { key: "status", direction: "asc" }).map((row) => row.id),
    ["stable", "beta", "parked"]
  );
  assert.deepEqual(
    sortModuleRows(rows, { key: "testingTier", direction: "desc" }).map((row) => row.id),
    ["stable", "beta", "parked"]
  );
});
