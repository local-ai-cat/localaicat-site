export type FilterKey = "channels" | "platforms" | "distributions" | "statuses" | "testingStatuses" | "neverDriven";
export type SortKey = "name" | "status" | "modular" | "testingStatus" | "logging" | "apiParity";
export type SortDirection = "asc" | "desc";

export type ModuleTableRow = {
  id: string;
  name: string;
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
};

export type ModuleFilters = Record<FilterKey, Set<string>>;
export type ModuleSort = { key: SortKey; direction: SortDirection };

export function emptyModuleFilters(): ModuleFilters {
  return {
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

export function filterModuleRows(rows: ModuleTableRow[], filters: ModuleFilters): ModuleTableRow[] {
  return rows.filter((row) =>
    matchesFacet(filters.channels, row.channels) &&
    matchesFacet(filters.platforms, row.platforms) &&
    matchesFacet(filters.distributions, row.distributions) &&
    matchesFacet(filters.statuses, [row.status]) &&
    matchesFacet(filters.testingStatuses, [row.testingStatus]) &&
    matchesFacet(filters.neverDriven, [row.neverDriven ? "yes" : "no"])
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

export function sortModuleRows(rows: ModuleTableRow[], sort: ModuleSort): ModuleTableRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const result = compareRows(left, right, sort.key);
    if (result !== 0) return result * direction;
    return left.name.localeCompare(right.name);
  });
}
