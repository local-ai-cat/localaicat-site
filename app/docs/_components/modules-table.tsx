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
    key: "testingTiers",
    label: "Testing",
    options: [
      { value: "heavy", label: "Heavy" },
      { value: "covered", label: "Covered" },
      { value: "thin", label: "Thin" },
      { value: "none", label: "None" }
    ]
  }
];

function labelFor(value: string): string {
  if (value === "wip") return "Work in progress";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function TableChip({ children, kind }: { children: React.ReactNode; kind: string }) {
  return <span className="moduleChip moduleTableChip" data-kind={kind}>{children}</span>;
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
            if (group.key === "statuses") return row.status === option.value;
            if (group.key === "testingTiers") return row.testingTier === option.value;
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

  const visibleRows = useMemo(
    () => sortModuleRows(filterModuleRows(rows, filters), sort),
    [filters, rows, sort]
  );

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

  function openRow(id: string, event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    router.push(`/docs/modules/${id}`);
  }

  function openRowWithKeyboard(id: string, event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(`/docs/modules/${id}`);
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
              <th scope="col">Channel</th>
              <th scope="col">Platforms</th>
              <th scope="col">Indoor / Outdoor</th>
              <SortHeader activeSort={sort} column="status" label="Status" onSort={changeSort} />
              <SortHeader activeSort={sort} column="modular" label="Modular" onSort={changeSort} />
              <SortHeader activeSort={sort} column="testingTier" label="Testing tier" onSort={changeSort} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                aria-label={`Open ${row.name}`}
                className="moduleTableRow"
                data-state={row.status}
                key={row.id}
                onClick={(event) => openRow(row.id, event)}
                onKeyDown={(event) => openRowWithKeyboard(row.id, event)}
                tabIndex={0}
              >
                <td className="moduleTableNameCell">
                  <Link href={`/docs/modules/${row.id}`}>
                    {row.name}<span aria-hidden="true">↗</span>
                  </Link>
                </td>
                <td><p className="moduleTableDescription">{row.description}</p></td>
                <td>
                  <div className="moduleTableChips">
                    {row.channels.map((channel) => (
                      <TableChip kind="channel" key={channel}>{channel === "none" ? "No channel" : labelFor(channel)}</TableChip>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="moduleTableChips">
                    {row.platforms.map((platform) => <TableChip kind="platform" key={platform}>{platform}</TableChip>)}
                  </div>
                </td>
                <td>
                  <div className="moduleTableChips">
                    {row.distributions.map((distribution) => (
                      <TableChip kind="distribution" key={distribution}>
                        {distribution === "none" ? "Not distributed" : labelFor(distribution)}
                      </TableChip>
                    ))}
                  </div>
                </td>
                <td><TableChip kind="status">{labelFor(row.status)}</TableChip></td>
                <td><TableChip kind="modular">{labelFor(row.modular)}</TableChip></td>
                <td>
                  <div className="moduleTestingCell">
                    <TableChip kind="testing">{labelFor(row.testingTier)}</TableChip>
                    <span title={`Approximately ${row.testingCases} test cases`}>~{row.testingCases}</span>
                  </div>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td className="moduleTableEmpty" colSpan={8}>No modules match these filters. Clear a filter to widen the view.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
