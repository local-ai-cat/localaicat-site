"use client";

import { useMemo, useState } from "react";
import {
  packageLockStatus,
  selectPackageRows,
  type PackageLockStatus,
  type PackageRow,
  type PackageSortDirection,
  type PackageSortKey,
} from "../../../lib/package-table";

export type { PackageRow } from "../../../lib/package-table";

const KINDS: Array<PackageRow["ownerKind"]> = [
  "feature",
  "engine",
  "platform",
  "harness",
  "vendored",
  "unowned",
];
const TIERS: Array<PackageRow["testing"]["tier"]> = ["heavy", "covered", "thin", "none"];
const LOCKS: PackageLockStatus[] = ["holds", "fails"];

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ExpandableList({ label, items }: { label: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <span className="moduleChip" data-kind="muted">0</span>;
  return (
    <button
      type="button"
      className="moduleChip moduleTableChip"
      data-kind="package"
      aria-expanded={open}
      title={open ? undefined : items.join(", ")}
      onClick={() => setOpen((value) => !value)}
    >
      {open ? `${label}: ${items.join(", ")}` : `${items.length}`}
    </button>
  );
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  onSort,
  numeric,
}: {
  label: string;
  column: PackageSortKey;
  sort: PackageSortKey;
  dir: PackageSortDirection;
  onSort: (key: PackageSortKey) => void;
  numeric?: boolean;
}) {
  const active = sort === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      style={{ textAlign: numeric ? "right" : "left" }}
    >
      <button type="button" className="moduleSortButton" onClick={() => onSort(column)}>
        {label}
        <span aria-hidden="true">{active ? (dir === "asc" ? " ▲" : " ▼") : ""}</span>
      </button>
    </th>
  );
}

export function PackagesTable({ rows }: { rows: PackageRow[] }) {
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [tiers, setTiers] = useState<Set<string>>(new Set());
  const [locks, setLocks] = useState<Set<PackageLockStatus>>(new Set());
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [gatesOnly, setGatesOnly] = useState(false);
  const [sort, setSort] = useState<PackageSortKey>("name");
  const [dir, setDir] = useState<PackageSortDirection>("asc");

  function toggle<Value extends string>(set: Set<Value>, value: Value, update: (next: Set<Value>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  }

  function onSort(key: PackageSortKey) {
    if (key === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "name" || key === "owner" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    return selectPackageRows(rows, {
      query,
      kinds,
      tiers,
      locks,
      linkedOnly,
      gatesOnly,
      sort,
      direction: dir,
    });
  }, [rows, query, kinds, tiers, locks, linkedOnly, gatesOnly, sort, dir]);

  return (
    <div className="moduleTableExperience">
      <div className="moduleFilters">
        <input
          type="search"
          className="moduleSearch"
          placeholder="Search packages…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search packages by name or owner"
        />
        <div className="moduleFilterGroups">
          <div className="moduleTableChips" role="group" aria-label="Filter by kind">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="moduleFilterChip"
                aria-pressed={kinds.has(kind)}
                onClick={() => toggle(kinds, kind, setKinds)}
              >
                {titleCase(kind)}
                <em> {rows.filter((r) => r.ownerKind === kind).length}</em>
              </button>
            ))}
          </div>
          <div className="moduleTableChips" role="group" aria-label="Filter by testing evidence and lock">
            {TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                className="moduleFilterChip"
                aria-pressed={tiers.has(tier)}
                onClick={() => toggle(tiers, tier, setTiers)}
              >
                {titleCase(tier)}
              </button>
            ))}
            {LOCKS.map((lock) => (
              <button
                key={lock}
                type="button"
                className="moduleFilterChip"
                aria-pressed={locks.has(lock)}
                onClick={() => toggle(locks, lock, setLocks)}
              >
                Lock {lock} <em>{rows.filter((row) => packageLockStatus(row) === lock).length}</em>
              </button>
            ))}
            <button
              type="button"
              className="moduleFilterChip"
              aria-pressed={linkedOnly}
              onClick={() => setLinkedOnly((v) => !v)}
            >
              Linked only
            </button>
            <button
              type="button"
              className="moduleFilterChip"
              aria-pressed={gatesOnly}
              onClick={() => setGatesOnly((v) => !v)}
            >
              Has App Store gates
            </button>
          </div>
        </div>
      </div>

      <div className="moduleTableMeta" aria-live="polite">
        <strong>{filtered.length}</strong> / {rows.length} packages
      </div>

      <div className="moduleTableScroll" tabIndex={0}>
        <table className="moduleTable">
          <thead>
            <tr>
              <SortHeader label="Package" column="name" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label="Owner" column="owner" sort={sort} dir={dir} onSort={onSort} />
              <th scope="col">Kind</th>
              <SortHeader label="Testing" column="testing" sort={sort} dir={dir} onSort={onSort} numeric />
              <SortHeader label="Lock" column="lock" sort={sort} dir={dir} onSort={onSort} />
              <th scope="col">Modular</th>
              <SortHeader label="Deps" column="deps" sort={sort} dir={dir} onSort={onSort} numeric />
              <SortHeader label="Used by" column="dependents" sort={sort} dir={dir} onSort={onSort} numeric />
              <th scope="col">Build</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.name}>
                <td><code>{row.name}</code></td>
                <td>{row.owner ?? <span className="moduleChip" data-kind="muted">unowned</span>}</td>
                <td><span className="moduleChip moduleTableChip" data-kind={`kind-${row.ownerKind}`}>{row.ownerKind}</span></td>
                <td style={{ textAlign: "right" }}>
                  <span
                    className="moduleChip moduleTableChip"
                    data-kind={`tier-${row.testing.tier}`}
                    title={[
                      `${row.testing.counts.total} derived test declarations`,
                      `${row.testing.counts.xctest} XCTest · ${row.testing.counts.swiftTesting} Swift Testing`,
                      `Wired: ${row.testing.wiredness}`,
                      `Suites: ${row.testing.suitePaths.join(", ") || "none"}`,
                      `Ratchets: ${row.testing.ratchets.map((ratchet) => ratchet.id).join(", ") || "none"}`,
                      `Real surface: ${row.testing.realSurface.status}`,
                    ].join("\n")}
                  >
                    {row.testing.tier} · {row.testing.counts.total}
                  </span>
                </td>
                <td>
                  <span
                    className="moduleChip moduleTableChip"
                    data-kind={`testing-lock-${packageLockStatus(row)}`}
                    title={[
                      `Current: ${row.testing.counts.total} · floor: ${row.testing.lock.minimumTestCount}`,
                      `Suite required: ${row.testing.lock.suiteRequired ? "yes" : "no"}`,
                      `Wiredness required: ${row.testing.lock.wirednessRequired ? "yes" : "no"}`,
                      `Required ratchets: ${row.testing.lock.requiredRatchets.join(", ") || "none"}`,
                    ].join("\n")}
                  >
                    {packageLockStatus(row)}
                  </span>
                </td>
                <td>{row.modular ? <span className="moduleChip moduleTableChip" data-kind={`modular-${row.modular}`}>{row.modular}</span> : <span className="moduleChip" data-kind="muted">n/a</span>}</td>
                <td style={{ textAlign: "right" }}><ExpandableList label="deps" items={row.deps} /></td>
                <td style={{ textAlign: "right" }}><ExpandableList label="used by" items={row.dependents} /></td>
                <td>
                  {row.linkedInProject
                    ? <span className="moduleChip moduleTableChip" data-kind="linked">linked</span>
                    : <span className="moduleChip" data-kind="muted">not linked</span>}
                  {row.appStoreGates.length > 0 && (
                    <span
                      className="moduleChip moduleTableChip"
                      data-kind="gate"
                      title={row.appStoreGates.map((g) => `${g.file}:${g.line}`).join("\n")}
                    >
                      ⚑ {row.appStoreGates.length}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
                  No packages match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
