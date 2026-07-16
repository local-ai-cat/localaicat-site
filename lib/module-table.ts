export type FilterKey = "channels" | "platforms" | "distributions" | "statuses" | "testingTiers";
export type SortKey = "name" | "status" | "modular" | "testingTier";
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
  testingTier: "none" | "thin" | "covered" | "heavy";
  testingCases: number;
};

export type ModuleFilters = Record<FilterKey, Set<string>>;
export type ModuleSort = { key: SortKey; direction: SortDirection };

export function emptyModuleFilters(): ModuleFilters {
  return {
    channels: new Set(),
    platforms: new Set(),
    distributions: new Set(),
    statuses: new Set(),
    testingTiers: new Set()
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
    matchesFacet(filters.testingTiers, [row.testingTier])
  );
}

const statusOrder = ["live", "beta", "wip", "locked", "purgatory"];
const modularOrder = ["yes", "partial", "no"];
const testingOrder = ["none", "thin", "covered", "heavy"];

function orderedValue(value: string, order: string[]): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function compareRows(left: ModuleTableRow, right: ModuleTableRow, key: SortKey): number {
  if (key === "name") return left.name.localeCompare(right.name);
  if (key === "status") return orderedValue(left.status, statusOrder) - orderedValue(right.status, statusOrder);
  if (key === "modular") return orderedValue(left.modular, modularOrder) - orderedValue(right.modular, modularOrder);
  return orderedValue(left.testingTier, testingOrder) - orderedValue(right.testingTier, testingOrder);
}

export function sortModuleRows(rows: ModuleTableRow[], sort: ModuleSort): ModuleTableRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const result = compareRows(left, right, sort.key);
    if (result !== 0) return result * direction;
    return left.name.localeCompare(right.name);
  });
}
