import type { Flavor, PackageState } from "./build-anatomy.ts";

export type RowKind = "feature" | "engine" | "platform" | "harness" | "vendored";
export type FilterKey = "kinds" | "channels" | "platforms" | "distributions" | "statuses" | "testingStatuses" | "neverDriven";
export type SortKey = "name" | "status" | "modular" | "testingStatus" | "logging" | "apiParity";
export type SortDirection = "asc" | "desc";

export type RowFlavorState = { state: PackageState; reason: string | null };

export type ModuleTableRow = {
  id: string;
  name: string;
  kind: RowKind;
  clickable: boolean;
  description: string;
  channels: string[];
  platforms: string[];
  distributions: string[];
  status: string;
  modular: "yes" | "partial" | "no";
  testingStatus: "untested" | "unit-only" | "behavioral";
  testingCases: number;
  hasSnapshot: boolean;
  neverDriven: boolean;
  logging: string;
  loggingSignal: string;
  apiParity: "full" | "partial" | "none" | "notApplicable";
  ownedPackages: string[];
  usesPackages: string[];
  packageGates: Record<string, Array<{ file: string; line: number }>>;
  flavorStates: Record<Flavor, RowFlavorState>;
};

export type ModuleFilters = Record<FilterKey, Set<string>>;
export type ModuleSort = { key: SortKey; direction: SortDirection };

export function isFeatureRow(row: ModuleTableRow): boolean {
  return row.kind === "feature";
}

export function emptyModuleFilters(): ModuleFilters {
  return {
    kinds: new Set(),
    channels: new Set(),
    platforms: new Set(),
    distributions: new Set(),
    statuses: new Set(),
    testingStatuses: new Set(),
    neverDriven: new Set()
  };
}

function matchesFacet(selected: Set<string>, values: string[]): boolean {
  return selected.size === 0 || values.some((value) => selected.has(value));
}

// Feature-only facets (status, provisional testing, drive gap) do not apply to
// infrastructure rows. Selecting one of these filters therefore narrows to
// feature rows only — infrastructure rows never match a feature-only facet.
function matchesFeatureFacet(selected: Set<string>, row: ModuleTableRow, value: string): boolean {
  if (selected.size === 0) return true;
  return isFeatureRow(row) && selected.has(value);
}

export function filterModuleRows(rows: ModuleTableRow[], filters: ModuleFilters): ModuleTableRow[] {
  return rows.filter((row) =>
    matchesFacet(filters.kinds, [row.kind]) &&
    matchesFacet(filters.channels, row.channels) &&
    matchesFacet(filters.platforms, row.platforms) &&
    matchesFacet(filters.distributions, row.distributions) &&
    matchesFeatureFacet(filters.statuses, row, row.status) &&
    matchesFeatureFacet(filters.testingStatuses, row, row.testingStatus) &&
    matchesFeatureFacet(filters.neverDriven, row, row.neverDriven ? "yes" : "no")
  );
}

const statusOrder = ["live", "beta", "wip", "locked", "purgatory"];
const modularOrder = ["yes", "partial", "no"];
const testingOrder = ["untested", "unit-only", "behavioral"];
const loggingOrder = ["L0", "L0-L1", "L1", "L2", "L3"];
const apiParityOrder = ["none", "partial", "full"];

function orderedValue(value: string, order: string[]): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function compareRows(left: ModuleTableRow, right: ModuleTableRow, key: SortKey): number {
  if (key === "name") return left.name.localeCompare(right.name);
  if (key === "status") return orderedValue(left.status, statusOrder) - orderedValue(right.status, statusOrder);
  if (key === "modular") return orderedValue(left.modular, modularOrder) - orderedValue(right.modular, modularOrder);
  if (key === "logging") return orderedValue(left.logging, loggingOrder) - orderedValue(right.logging, loggingOrder);
  if (key === "apiParity") return orderedValue(left.apiParity, apiParityOrder) - orderedValue(right.apiParity, apiParityOrder);
  return orderedValue(left.testingStatus, testingOrder) - orderedValue(right.testingStatus, testingOrder);
}

function isStrippedInLens(row: ModuleTableRow, buildLens: Flavor): boolean {
  return row.flavorStates[buildLens].state === "stripped";
}

export function sortModuleRows(
  rows: ModuleTableRow[],
  sort: ModuleSort,
  buildLens: Flavor | null = null
): ModuleTableRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    // With a build lens active, packages stripped from that flavor sink to the
    // bottom (greyed) so the reader sees what is NOT in the build without hiding it.
    if (buildLens) {
      const stripGrouping = Number(isStrippedInLens(left, buildLens)) - Number(isStrippedInLens(right, buildLens));
      if (stripGrouping !== 0) return stripGrouping;
    }
    // Feature rows always group ahead of infrastructure rows; the chosen sort key
    // orders within each group so sorting stays useful without interleaving.
    const grouping = Number(!isFeatureRow(left)) - Number(!isFeatureRow(right));
    if (grouping !== 0) return grouping;
    const result = compareRows(left, right, sort.key);
    if (result !== 0) return result * direction;
    return left.name.localeCompare(right.name);
  });
}
