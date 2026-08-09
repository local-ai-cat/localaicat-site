export type PackageTestingTier = "none" | "thin" | "covered" | "heavy";
export type PackageTestWiredness = "push-or-pull-request" | "explicit-on-demand" | "orphan";
export type PackageLockStatus = "holds" | "fails";

export type PackageRow = {
  name: string;
  owner: string | null;
  ownerId: string | null;
  ownerKind: "feature" | "engine" | "platform" | "harness" | "vendored" | "unowned";
  modular: string | null;
  testing: {
    counts: { xctest: number; swiftTesting: number; total: number };
    tier: PackageTestingTier;
    suitePaths: string[];
    wiredness: PackageTestWiredness;
    wiringEvidencePaths: string[];
    ratchets: Array<{
      id: string;
      enforcement: "push-or-pull-request" | "explicit-on-demand";
      evidencePaths: string[];
    }>;
    realSurface: {
      status: "none-detected" | "command-only" | "recorded";
      commands: string[];
      recordedEvidencePaths: string[];
    };
    lock: {
      satisfied: boolean;
      suiteRequired: boolean;
      minimumTestCount: number;
      wirednessRequired: boolean;
      requiredRatchets: string[];
      loweredByCommit?: string;
    };
  };
  deps: string[];
  dependents: string[];
  appStoreGates: Array<{ file: string; line: number }>;
  linkedInProject: boolean;
};

export type PackageSortKey = "name" | "owner" | "testing" | "lock" | "deps" | "dependents";
export type PackageSortDirection = "asc" | "desc";

export type PackageTableSelection = {
  query: string;
  kinds: ReadonlySet<string>;
  tiers: ReadonlySet<string>;
  locks: ReadonlySet<PackageLockStatus>;
  linkedOnly: boolean;
  gatesOnly: boolean;
  sort: PackageSortKey;
  direction: PackageSortDirection;
};

export function packageLockStatus(row: PackageRow): PackageLockStatus {
  return row.testing.lock.satisfied ? "holds" : "fails";
}

export function selectPackageRows(rows: PackageRow[], selection: PackageTableSelection): PackageRow[] {
  const query = selection.query.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (selection.kinds.size > 0 && !selection.kinds.has(row.ownerKind)) return false;
    if (selection.tiers.size > 0 && !selection.tiers.has(row.testing.tier)) return false;
    if (selection.locks.size > 0 && !selection.locks.has(packageLockStatus(row))) return false;
    if (selection.linkedOnly && !row.linkedInProject) return false;
    if (selection.gatesOnly && row.appStoreGates.length === 0) return false;
    if (query && !(row.name.toLowerCase().includes(query) || (row.owner ?? "").toLowerCase().includes(query))) {
      return false;
    }
    return true;
  });

  const factor = selection.direction === "asc" ? 1 : -1;
  return filtered.sort((left, right) => {
    switch (selection.sort) {
      case "owner":
        return factor * (left.owner ?? "").localeCompare(right.owner ?? "");
      case "testing":
        return factor * (left.testing.counts.total - right.testing.counts.total);
      case "lock":
        return factor * packageLockStatus(left).localeCompare(packageLockStatus(right));
      case "deps":
        return factor * (left.deps.length - right.deps.length);
      case "dependents":
        return factor * (left.dependents.length - right.dependents.length);
      default:
        return factor * left.name.localeCompare(right.name);
    }
  });
}
