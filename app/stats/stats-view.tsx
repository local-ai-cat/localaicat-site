import styles from "./stats.module.css";
import { StatsExplorer, type ExplorerMetric } from "./stats-explorer";
import { SiteShell } from "../_components/site-shell";
import { COUNTING_STARTED, GITHUB_SNAPSHOTS_STARTED, type BucketValue, type StatsReport } from "../../lib/site-stats-report";
import { HISTORY_START_MONTH, STATS_RANGES, type StatsRange } from "../../lib/stats-range";

function count(value: number | null | undefined): string {
  return value === null || value === undefined ? "–" : value.toLocaleString("en-US");
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** "28 Oct" for a day, "Oct 2026" for a month. */
function bucketLabel(key: string): string {
  if (key.length === 7) {
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function longDay(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).toLowerCase();
}

function launchMonth(): string {
  return new Date(`${HISTORY_START_MONTH}-01T00:00:00Z`)
    .toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).toLowerCase();
}

function values(series: BucketValue[]): number[] {
  return series.map(entry => entry.value);
}

function percent(part: number | null, whole: number | null): string | null {
  if (part === null || whole === null || whole === 0) return null;
  const share = (part / whole) * 100;
  return `${share < 10 ? share.toFixed(1) : Math.round(share)}%`;
}

function metricsFor(report: StatsReport): ExplorerMetric[] {
  const appStore = report.appStore;
  const appStoreRange = appStore ? appStore.units.ios + appStore.units.mac : null;
  const downloads = appStoreRange === null && report.direct === null ? null : (appStoreRange ?? 0) + (report.direct ?? 0);
  const perBucket = report.granularity === "month" ? "a month" : "a day";
  const per = (unit: string): string => `${unit} ${perBucket}`;
  return [
    {
      id: "downloads",
      label: "downloads",
      unit: "downloads",
      axis: per("downloads"),
      total: downloads,
      series: [
        { name: "iphone and ipad", tone: "lavender", values: report.downloads.map(bucket => bucket.ios) },
        { name: "mac app store", tone: "mint", values: report.downloads.map(bucket => bucket.mac) },
        { name: "mac, from the site", tone: "amber", values: report.downloads.map(bucket => bucket.direct ?? 0) }
      ],
      note: `first downloads only, never updates. apple keeps months for a year; older months share their year's total evenly, so the shaded stretch adds up but isn't month by month. apple publishes a day the next morning, pacific time${appStore?.latestDay ? `; the newest here is ${longDay(appStore.latestDay)}` : ""}. github only keeps running totals, so site downloads get their own bars from ${longDay(GITHUB_SNAPSHOTS_STARTED)}.`,
      off: "downloads aren't connected on this deployment",
      spread: report.downloads.some(bucket => bucket.spread)
        ? { points: report.downloads.map(bucket => bucket.spread), label: "apple's yearly total, shared evenly" }
        : undefined
    },
    {
      id: "visits",
      label: "visits",
      unit: "visits",
      axis: per("visits"),
      total: report.visits ? sum(values(report.visits)) : null,
      series: report.visits && [{ name: "visits", tone: "lavender", values: values(report.visits) }],
      note: "goatcounter's daily visitors on public pages, without cookies.",
      off: "goatcounter didn't answer just now"
    },
    {
      id: "macs",
      label: "macs",
      unit: report.granularity === "month" ? "macs on the busiest day" : "macs today",
      axis: "macs a day",
      total: report.macs ? (report.granularity === "month" ? Math.max(0, ...values(report.macs)) : report.macs.at(-1)?.value ?? 0) : null,
      series: report.macs && [{ name: "macs", tone: "mint", values: values(report.macs) }],
      note: `distinct macs ${perBucket === "a day" ? "a day" : "on each month's busiest day"} whose app asked the site for updates. it starts with the first build whose feed is localaicat.com.`,
      off: "macs aren't counted on this deployment"
    },
    {
      id: "buttons",
      label: "download buttons",
      unit: "clicks",
      axis: per("clicks"),
      total: report.siteClicks ? sum(report.siteClicks.map(bucket => bucket.stable + bucket.beta)) : null,
      series: report.siteClicks && [
        { name: "stable", tone: "lavender", values: report.siteClicks.map(bucket => bucket.stable) },
        { name: "beta", tone: "mint", values: report.siteClicks.map(bucket => bucket.beta) }
      ],
      note: `clicks on the site's download buttons that went on to github, link previews left out. counted from ${longDay(COUNTING_STARTED)}.`,
      off: "download buttons aren't counted on this deployment"
    },
    {
      id: "checkouts",
      label: "checkouts",
      unit: "checkouts started",
      axis: per("checkouts"),
      total: report.checkouts ? sum(values(report.checkouts)) : null,
      series: report.checkouts && [{ name: "checkouts", tone: "amber", values: values(report.checkouts) }],
      note: `people who went from a plan to polar's checkout. counted from ${longDay(COUNTING_STARTED)}.`,
      off: "checkouts aren't counted on this deployment"
    },
    {
      id: "orders",
      label: "orders",
      unit: "orders",
      axis: per("orders"),
      total: report.orders ? report.orders.newPaid + report.orders.newFree : null,
      series: report.firstOrders && [{ name: "orders", tone: "amber", values: values(report.firstOrders) }],
      note: "first orders on polar, paid or free with a full discount; renewals are listed below. never an amount.",
      off: "polar didn't answer just now"
    }
  ];
}

function Leader({ label, value }: { label: string; value: string }) {
  return <div className={styles.leader}><dt>{label}</dt><dd>{value}</dd></div>;
}

/** The page itself, given a gathered report; kept apart from the loading so it can be rendered from fixtures. */
export function StatsView({ report, range }: { report: StatsReport; range: StatsRange }) {
  const rangeLabel = STATS_RANGES.find(option => option.range === range)?.label ?? range;
  const span = range === "all" ? `since ${launchMonth()}` : `in the last ${rangeLabel}`;
  const { allTime, appStore, orders, github } = report;
  const visits = report.visits ? sum(values(report.visits)) : null;
  const buttons = report.siteClicks ? sum(report.siteClicks.map(bucket => bucket.stable + bucket.beta)) : null;
  const checkouts = report.checkouts ? sum(values(report.checkouts)) : null;
  const firstOrders = orders ? orders.newPaid + orders.newFree : null;
  const path = [
    { label: "visits", value: visits },
    { label: "download buttons", value: buttons },
    { label: "checkouts", value: checkouts },
    { label: "orders", value: firstOrders }
  ];

  return (
    <SiteShell siteMode="personal">
      <article className={styles.page}>
        <header className={styles.hero}>
          <h1 className={styles.title}>how the cat is doing</h1>
          <p className={styles.lede}>
            <b>{count(allTime.downloads)}</b> downloads since the cat first went out in {launchMonth()}
            {allTime.appStore === null
              ? ", straight from this site."
              : `: ${count(allTime.appStore)} from the app store and ${count(allTime.direct)} straight from this site.`}
          </p>
        </header>

        <StatsExplorer
          range={range}
          ranges={STATS_RANGES}
          span={span}
          labels={report.buckets.map(bucketLabel)}
          metrics={metricsFor(report)}
        />

        <section className={styles.path} aria-label={`From a visit to an order, ${span}`}>
          <h2>from a visit to an order, {span}</h2>
          <ol>
            {path.map((step, index) => (
              <li key={step.label}>
                <b>{count(step.value)}</b>
                <span>{step.label}</span>
                {index > 0 && percent(step.value, path[index - 1].value) && (
                  <small>{percent(step.value, path[index - 1].value)} of the step before</small>
                )}
              </li>
            ))}
          </ol>
          <p className={styles.aside}>totals over the range, not the same people followed through.</p>
        </section>

        <section className={styles.ledger} aria-label="The detail">
          <div>
            <h2>app store, {span}</h2>
            <dl>
              <Leader label="first downloads, iphone and ipad" value={count(appStore?.units.ios)} />
              <Leader label="first downloads, mac" value={count(appStore?.units.mac)} />
              <Leader label="downloaded again" value={count(appStore?.units.redownloads)} />
              <Leader label="updates" value={count(appStore?.units.updates)} />
              <Leader label="in-app purchases" value={count(appStore?.units.purchases)} />
            </dl>
          </div>
          <div>
            <h2>straight from the site, all time</h2>
            <dl>
              <Leader label="new installs (the plain dmg)" value={count(allTime.direct)} />
              <Leader label="sparkle updates (versioned dmgs)" value={count(allTime.directUpdates)} />
              {github?.channels.filter(row => row.channel !== "stable").map(row => (
                <Leader key={row.channel} label={`${row.channel} builds, ${row.releases} releases`} value={count(row.dmgDownloads)} />
              ))}
            </dl>
          </div>
          <div>
            <h2>orders, {span}</h2>
            <dl>
              <Leader label="paid" value={count(orders?.newPaid)} />
              <Leader label="free, full discount or trial" value={count(orders?.newFree)} />
              <Leader label="renewals" value={count(orders?.renewals)} />
            </dl>
            {report.macsToday.length > 0 && (
              <>
                <h2>macs today, by version</h2>
                <dl>{report.macsToday.map(row => <Leader key={row.version} label={row.version} value={count(row.macs)} />)}</dl>
              </>
            )}
          </div>
          {github && github.topStable.length > 0 && (
            <div>
              <h2>busiest releases</h2>
              <dl>
                {github.topStable.map(row => (
                  <Leader key={row.tag} label={`${row.tag}${row.publishedAt ? `, ${longDay(row.publishedAt)}` : ""}`} value={count(row.dmgDownloads)} />
                ))}
              </dl>
            </div>
          )}
        </section>

        <p className={styles.footnote}>
          counts only, never money or people. app store numbers come from apple&rsquo;s sales reports, visits from
          goatcounter, orders from polar, site downloads from github&rsquo;s own counts, and the rest the site counts
          itself. the page refreshes every few minutes; days are utc.
        </p>
      </article>
    </SiteShell>
  );
}
