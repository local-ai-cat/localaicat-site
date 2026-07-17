"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  emptyModuleFilters,
  filterModuleRows,
  sortModuleRows,
  type FilterKey,
  type ModuleFilters,
  type ModuleSort,
  type ModuleTableRow,
  type SortKey
} from "../../../lib/module-table";

type FilterOption = { value: string; label: string };
type FilterGroup = { key: FilterKey; label: string; options: FilterOption[] };

const filterGroups: FilterGroup[] = [
  {
    key: "kinds",
    label: "Kind",
    options: [
      { value: "feature", label: "Feature" },
      { value: "engine", label: "Engine" },
      { value: "platform", label: "Platform" },
      { value: "harness", label: "Harness" },
      { value: "vendored", label: "Vendored" }
    ]
  },
  {
    key: "channels",
    label: "Channel",
    options: [
      { value: "main", label: "Main" },
      { value: "beta", label: "Beta" },
      { value: "alpha", label: "Alpha" },
      { value: "none", label: "No channel" }
    ]
  },
  {
    key: "platforms",
    label: "Platform",
    options: [
      { value: "macOS", label: "macOS" },
      { value: "iOS", label: "iOS" }
    ]
  },
  {
    key: "distributions",
    label: "Indoor / Outdoor",
    options: [
      { value: "indoor", label: "Indoor" },
      { value: "outdoor", label: "Outdoor" },
      { value: "none", label: "Not distributed" }
    ]
  },
  {
    key: "statuses",
    label: "Status",
    options: [
      { value: "live", label: "Live" },
      { value: "beta", label: "Beta" },
      { value: "wip", label: "Work in progress" },
      { value: "locked", label: "Locked" },
      { value: "purgatory", label: "Purgatory" }
    ]
  },
  {
    key: "testingStatuses",
    label: "Provisional testing",
    options: [
      { value: "behavioral", label: "+Behavioral" },
      { value: "unit-only", label: "Unit only" },
      { value: "untested", label: "Untested" }
    ]
  },
  {
    key: "neverDriven",
    label: "Drive gap",
    options: [
      { value: "yes", label: "⚠ Never driven" }
    ]
  }
];

const provisionalTooltip = "Provisional signal from test-file presence — NOT the testing grade. Real grade lands with the ledger grade script.";
const loggingTooltip = "Provisional logging/observability grade from a source scan — NOT an audited grade. L0 bare prints · L1 structured logging · L2 Sentry/telemetry.";

const apiParityLabels: Record<ModuleTableRow["apiParity"], string> = {
  full: "Full",
  partial: "Partial",
  none: "None",
  notApplicable: "n·a"
};

const kindLabels: Record<ModuleTableRow["kind"], string> = {
  feature: "Feature",
  engine: "Engine",
  platform: "Platform",
  harness: "Harness",
  vendored: "Vendored"
};

function labelFor(value: string): string {
  if (value === "wip") return "Work in progress";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function isFeatureRow(row: ModuleTableRow): boolean {
  return row.kind === "feature";
}

function NotApplicable() {
  return <span className="moduleNa" title="Not applicable to infrastructure modules">n/a</span>;
}

function KindBadge({ kind }: { kind: ModuleTableRow["kind"] }) {
  return <span className="moduleKindBadge" data-kind={kind}>{kindLabels[kind]}</span>;
}

function PackagesCell({
  expanded,
  onToggle,
  row
}: {
  expanded: boolean;
  onToggle: () => void;
  row: ModuleTableRow;
}) {
  const owned = row.ownedPackages;
  const uses = row.usesPackages;
  if (owned.length === 0 && uses.length === 0) {
    return <span className="moduleNa" title="No packages mapped to this module yet">—</span>;
  }

  const ownedLabel = isFeatureRow(row) ? "Owns" : "Packages";
  const title = [
    owned.length > 0 ? `${ownedLabel}: ${owned.join(", ")}` : null,
    uses.length > 0 ? `Uses: ${uses.join(", ")}` : null
  ].filter(Boolean).join(" · ");

  return (
    <div className="modulePackagesCell">
      <button
        aria-expanded={expanded}
        className="modulePackagesToggle"
        onClick={onToggle}
        title={title}
        type="button"
      >
        {owned.length} pkg{owned.length === 1 ? "" : "s"}
        {uses.length > 0 ? <span className="modulePackagesUses"> · {uses.length} used</span> : null}
      </button>
      {expanded ? (
        <div className="modulePackagesList">
          {owned.length > 0 ? (
            <div>
              <span className="modulePackagesListLabel">{ownedLabel}</span>
              <ul>{owned.map((name) => <li key={name}><code>{name}</code></li>)}</ul>
            </div>
          ) : null}
          {uses.length > 0 ? (
            <div>
              <span className="modulePackagesListLabel">Uses</span>
              <ul>{uses.map((name) => <li key={name}><code>{name}</code></li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function provisionalLabel(value: ModuleTableRow["testingStatus"]): string {
  return value === "behavioral" ? "prov. +behavioral" : `prov. ${value}`;
}

function TableChip({ children, kind, title }: { children: React.ReactNode; kind: string; title?: string }) {
  return <span className="moduleChip moduleTableChip" data-kind={kind} title={title}>{children}</span>;
}

function SortHeader({
  activeSort,
  column,
  label,
  onSort
}: {
  activeSort: ModuleSort;
  column: SortKey;
  label: string;
  onSort: (column: SortKey) => void;
}) {
  const active = activeSort.key === column;
  const ariaSort = active ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th aria-sort={ariaSort} scope="col">
      <button className="moduleSortButton" onClick={() => onSort(column)} type="button">
        {label}
        <span aria-hidden="true" className="moduleSortIndicator">
          {active ? (activeSort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function FilterControls({
  filters,
  onClear,
  onToggle,
  rows
}: {
  filters: ModuleFilters;
  onClear: () => void;
  onToggle: (key: FilterKey, value: string) => void;
  rows: ModuleTableRow[];
}) {
  const activeCount = Object.values(filters).reduce((total, values) => total + values.size, 0);

  return (
    <section aria-label="Filter modules" className="moduleFilters">
      <div className="moduleFilterHeading">
        <div>
          <p>Filter modules</p>
          <span>Select more than one option to widen a category.</span>
        </div>
        <button className="moduleFilterClear" disabled={activeCount === 0} onClick={onClear} type="button">
          Clear{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="moduleFilterGroups">
        {filterGroups.map((group) => {
          const availableOptions = group.options.filter((option) => rows.some((row) => {
            if (group.key === "kinds") return row.kind === option.value;
            // Feature-only facets never surface options from infrastructure rows.
            if (group.key === "statuses") return isFeatureRow(row) && row.status === option.value;
            if (group.key === "testingStatuses") return isFeatureRow(row) && row.testingStatus === option.value;
            if (group.key === "neverDriven") return isFeatureRow(row) && row.neverDriven && option.value === "yes";
            return row[group.key].includes(option.value);
          }));

          return (
            <fieldset key={group.key}>
              <legend>{group.label}</legend>
              <div className="moduleFilterOptions">
                {availableOptions.map((option) => {
                  const selected = filters[group.key].has(option.value);
                  return (
                    <button
                      aria-pressed={selected}
                      className="moduleFilterChip"
                      key={option.value}
                      onClick={() => onToggle(group.key, option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}

export function ModulesTable({ rows }: { rows: ModuleTableRow[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<ModuleFilters>(emptyModuleFilters);
  const [sort, setSort] = useState<ModuleSort>({ key: "name", direction: "asc" });
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(() => new Set());

  const visibleRows = useMemo(
    () => sortModuleRows(filterModuleRows(rows, filters), sort),
    [filters, rows, sort]
  );

  function togglePackages(id: string) {
    setExpandedPackages((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFilter(key: FilterKey, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: new Set(current[key]) };
      if (next[key].has(value)) next[key].delete(value);
      else next[key].add(value);
      return next;
    });
  }

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function openRow(row: ModuleTableRow, event: MouseEvent<HTMLTableRowElement>) {
    if (!row.clickable) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    router.push(`/docs/modules/${row.id}`);
  }

  function openRowWithKeyboard(row: ModuleTableRow, event: KeyboardEvent<HTMLTableRowElement>) {
    if (!row.clickable) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(`/docs/modules/${row.id}`);
  }

  return (
    <div className="moduleTableExperience">
      <FilterControls
        filters={filters}
        onClear={() => setFilters(emptyModuleFilters())}
        onToggle={toggleFilter}
        rows={rows}
      />

      <div className="moduleTableMeta" aria-live="polite">
        Showing <strong>{visibleRows.length}</strong> of {rows.length} modules
      </div>

      <div className="moduleTableScroll" tabIndex={0}>
        <table className="moduleTable">
          <caption className="visuallyHidden">Local AI Cat modules and their shipping, modularity, and testing state</caption>
          <thead>
            <tr>
              <SortHeader activeSort={sort} column="name" label="Name" onSort={changeSort} />
              <th scope="col">Description</th>
              <th scope="col">Packages</th>
              <th scope="col">Channel</th>
              <th scope="col">Platforms</th>
              <th scope="col">Indoor / Outdoor</th>
              <SortHeader activeSort={sort} column="status" label="Status" onSort={changeSort} />
              <SortHeader activeSort={sort} column="modular" label="Modular" onSort={changeSort} />
              <SortHeader activeSort={sort} column="testingStatus" label="Provisional testing" onSort={changeSort} />
              <SortHeader activeSort={sort} column="logging" label="Logging" onSort={changeSort} />
              <SortHeader activeSort={sort} column="apiParity" label="Headless API" onSort={changeSort} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const feature = isFeatureRow(row);
              return (
              <tr
                aria-label={row.clickable ? `Open ${row.name}` : undefined}
                className="moduleTableRow"
                data-clickable={row.clickable}
                data-state={feature ? row.status : "na"}
                key={row.id}
                onClick={(event) => openRow(row, event)}
                onKeyDown={(event) => openRowWithKeyboard(row, event)}
                tabIndex={row.clickable ? 0 : -1}
              >
                <td className="moduleTableNameCell">
                  {row.clickable ? (
                    <Link href={`/docs/modules/${row.id}`}>
                      {row.name}<span aria-hidden="true">↗</span>
                    </Link>
                  ) : (
                    <span className="moduleTableNameStatic">{row.name}</span>
                  )}
                  <KindBadge kind={row.kind} />
                </td>
                <td><p className="moduleTableDescription">{row.description}</p></td>
                <td>
                  <PackagesCell
                    expanded={expandedPackages.has(row.id)}
                    onToggle={() => togglePackages(row.id)}
                    row={row}
                  />
                </td>
                <td>
                  {feature ? (
                    <div className="moduleTableChips">
                      {row.channels.map((channel) => (
                        <TableChip kind="channel" key={channel}>{channel === "none" ? "No channel" : labelFor(channel)}</TableChip>
                      ))}
                    </div>
                  ) : <NotApplicable />}
                </td>
                <td>
                  {feature ? (
                    <div className="moduleTableChips">
                      {row.platforms.map((platform) => <TableChip kind="platform" key={platform}>{platform}</TableChip>)}
                    </div>
                  ) : <NotApplicable />}
                </td>
                <td>
                  {feature ? (
                    <div className="moduleTableChips">
                      {row.distributions.map((distribution) => (
                        <TableChip kind="distribution" key={distribution}>
                          {distribution === "none" ? "Not distributed" : labelFor(distribution)}
                        </TableChip>
                      ))}
                    </div>
                  ) : <NotApplicable />}
                </td>
                <td>{feature ? <TableChip kind="status">{labelFor(row.status)}</TableChip> : <NotApplicable />}</td>
                <td>{feature ? <TableChip kind="modular">{labelFor(row.modular)}</TableChip> : <NotApplicable />}</td>
                <td>
                  {feature ? (
                    <div className="moduleTestingCell">
                      <TableChip
                        kind="testing"
                        title={`${provisionalTooltip} Approximately ${row.testingCases} test cases detected${row.hasSnapshot ? "; snapshot evidence present" : ""}.`}
                      >
                        {provisionalLabel(row.testingStatus)}
                      </TableChip>
                      {row.neverDriven ? <span className="moduleNeverDrivenBadge">⚠ never-driven</span> : null}
                    </div>
                  ) : <NotApplicable />}
                </td>
                <td>
                  {feature ? (
                    <TableChip kind="logging" title={`${loggingTooltip} Signal: ${row.loggingSignal}.`}>
                      {row.logging}
                      <span className="moduleChipProvisional" aria-hidden="true"> · prov.</span>
                    </TableChip>
                  ) : <NotApplicable />}
                </td>
                <td>
                  {feature ? (
                    <Link className="moduleApiLink" href={`/docs/modules/${row.id}#headless-api`}>
                      <TableChip kind="api" title={`Headless Local API parity: ${apiParityLabels[row.apiParity]}. Opens the API section for ${row.name}.`}>
                        {apiParityLabels[row.apiParity]}
                      </TableChip>
                    </Link>
                  ) : <NotApplicable />}
                </td>
              </tr>
              );
            })}
            {visibleRows.length === 0 ? (
              <tr>
                <td className="moduleTableEmpty" colSpan={11}>No modules match these filters. Clear a filter to widen the view.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
