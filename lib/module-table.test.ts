import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyModuleFilters,
  filterModuleRows,
  sortModuleRows,
  type ModuleTableRow
} from "./module-table.ts";

function featureRow(overrides: Partial<ModuleTableRow>): ModuleTableRow {
  return {
    id: "row",
    name: "Row",
    kind: "feature",
    clickable: true,
    description: "",
    channels: [],
    platforms: [],
    distributions: [],
    status: "live",
    modular: "yes",
    testingStatus: "untested",
    testingCases: 0,
    hasSnapshot: false,
    neverDriven: false,
    logging: "L0",
    loggingSignal: "",
    apiParity: "notApplicable",
    ownedPackages: [],
    usesPackages: [],
    packageGates: {},
    flavorStates: {
      indoor: { state: "linked", reason: null },
      outdoor: { state: "linked", reason: null },
      beta: { state: "linked", reason: null },
      alpha: { state: "linked", reason: null }
    },
    ...overrides
  };
}

const rows: ModuleTableRow[] = [
  featureRow({
    id: "stable",
    name: "Stable module",
    description: "Stable",
    channels: ["main", "beta"],
    platforms: ["macOS"],
    distributions: ["outdoor"],
    status: "live",
    modular: "yes",
    testingStatus: "behavioral",
    testingCases: 40,
    hasSnapshot: true,
    neverDriven: false
  }),
  featureRow({
    id: "parked",
    name: "Parked module",
    description: "Parked",
    channels: ["none"],
    platforms: ["macOS"],
    distributions: ["none"],
    status: "purgatory",
    modular: "partial",
    testingStatus: "untested",
    testingCases: 0,
    hasSnapshot: false,
    neverDriven: true
  }),
  featureRow({
    id: "beta",
    name: "Beta module",
    description: "Beta",
    channels: ["alpha", "beta"],
    platforms: ["iOS", "macOS"],
    distributions: ["indoor"],
    status: "beta",
    modular: "no",
    testingStatus: "unit-only",
    testingCases: 18,
    hasSnapshot: false,
    neverDriven: true
  })
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

test("filters provisional status and never-driven modules", () => {
  const filters = emptyModuleFilters();
  filters.testingStatuses = new Set(["unit-only", "behavioral"]);
  filters.neverDriven = new Set(["yes"]);

  assert.deepEqual(filterModuleRows(rows, filters).map((row) => row.id), ["beta"]);
});

const infraRow: ModuleTableRow = featureRow({
  id: "speech-engine",
  name: "Speech engine",
  kind: "engine",
  clickable: false,
  channels: [],
  platforms: [],
  distributions: [],
  status: "n/a",
  ownedPackages: ["SpeechPipeline", "LocalSpeechKit"]
});

test("kind filter includes infrastructure rows and narrows by kind", () => {
  const withInfra = [...rows, infraRow];
  const filters = emptyModuleFilters();
  filters.kinds = new Set(["engine"]);
  assert.deepEqual(filterModuleRows(withInfra, filters).map((row) => row.id), ["speech-engine"]);
});

test("feature-only facets exclude infrastructure rows", () => {
  const withInfra = [...rows, infraRow];
  const filters = emptyModuleFilters();
  filters.statuses = new Set(["live"]);
  assert.deepEqual(filterModuleRows(withInfra, filters).map((row) => row.id), ["stable"]);
});

test("feature rows always group ahead of infrastructure rows", () => {
  const withInfra = [infraRow, ...rows];
  assert.deepEqual(
    sortModuleRows(withInfra, { key: "name", direction: "asc" }).map((row) => row.id),
    ["beta", "parked", "stable", "speech-engine"]
  );
});

test("build lens sinks stripped rows to the bottom without hiding them", () => {
  const lensRows: ModuleTableRow[] = [
    featureRow({ id: "in", name: "In build" }),
    featureRow({
      id: "out",
      name: "Out of build",
      flavorStates: {
        indoor: { state: "stripped", reason: "Not shipped in Indoor" },
        outdoor: { state: "linked", reason: null },
        beta: { state: "linked", reason: null },
        alpha: { state: "linked", reason: null }
      }
    })
  ];
  // No lens: alphabetical grouping keeps declaration/name order.
  assert.deepEqual(
    sortModuleRows(lensRows, { key: "name", direction: "asc" }).map((row) => row.id),
    ["in", "out"]
  );
  // Indoor lens: the stripped row sinks last but stays present.
  assert.deepEqual(
    sortModuleRows(lensRows, { key: "name", direction: "asc" }, "indoor").map((row) => row.id),
    ["in", "out"]
  );
  // Reverse the names so "out" would sort first without the lens; the lens still sinks it.
  const flipped: ModuleTableRow[] = [
    featureRow({ id: "aaa-out", name: "Aaa out", flavorStates: {
      indoor: { state: "stripped", reason: "Not shipped in Indoor" },
      outdoor: { state: "linked", reason: null },
      beta: { state: "linked", reason: null },
      alpha: { state: "linked", reason: null }
    } }),
    featureRow({ id: "zzz-in", name: "Zzz in" })
  ];
  assert.deepEqual(
    sortModuleRows(flipped, { key: "name", direction: "asc" }, "indoor").map((row) => row.id),
    ["zzz-in", "aaa-out"]
  );
});

test("sorts semantic status and provisional testing status in either direction", () => {
  assert.deepEqual(
    sortModuleRows(rows, { key: "status", direction: "asc" }).map((row) => row.id),
    ["stable", "beta", "parked"]
  );
  assert.deepEqual(
    sortModuleRows(rows, { key: "testingStatus", direction: "desc" }).map((row) => row.id),
    ["stable", "beta", "parked"]
  );
});
