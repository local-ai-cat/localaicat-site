import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import styles from "./stats.module.css";
import { cachedStatsReport, COUNTING_STARTED, GITHUB_SNAPSHOTS_STARTED, type BucketValue, type StatsReport } from "../../lib/site-stats-report";
import { STATS_RANGES, parseRange, type StatsRange } from "../../lib/stats-range";

// Public, and only ever totals: no address, browser or visitor is stored, so none can be shown.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stats",
  description: "Downloads from the site and the App Store, Macs checking for updates, visits, checkouts and orders.",
  // Open to anyone with the link, but not something to land on from search; not in the sitemap either.
  robots: { index: false, follow: false }
};

const STORAGE_NOTE: Record<StatsReport["storage"], string> = {
  redis: "the site counts these itself.",
  memory: "local dev server: counted in memory, gone on restart.",
  off: "counting is off on this deployment."
};

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function count(value: number | null): string {
  return value === null ? "–" : value.toLocaleString("en-US");
}

/** "28 Oct" for a day, "Oct 2026" for a month. */
function bucketLabel(key: string): string {
  if (key.length === 7) {
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Tile({ value, label, detail, headline = false }: { value: number | null; label: string; detail?: string; headline?: boolean }) {
  return (
    <div className={headline ? `${styles.tile} ${styles.headline}` : styles.tile}>
      <b>{count(value)}</b><span>{label}</span>{detail && <small>{detail}</small>}
    </div>
  );
}

const SERIES_CLASSES = [styles.primary, styles.secondary, styles.tertiary];

/** One bar per bucket; the series stack in order from the bottom. */
function Bars({ keys, series, label }: { keys: string[]; series: number[][]; label: string }) {
  const totals = keys.map((_, index) => sum(series.map(values => values[index] ?? 0)));
  const peak = Math.max(1, ...totals);
  return (
    <>
      <div className={styles.bars} role="img" aria-label={`${label}, ${sum(totals)} in all`}>
        {keys.map((key, index) => (
          <div key={key} className={styles.bar} title={`${bucketLabel(key)}: ${totals[index]}`}>
            {series.map((values, seriesIndex) => (
              <i key={seriesIndex} className={SERIES_CLASSES[seriesIndex]} style={{ height: `${((values[index] ?? 0) / peak) * 100}%` }} />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.axis}><span>{bucketLabel(keys[0])}</span><span>{bucketLabel(keys[keys.length - 1])}</span></div>
    </>
  );
}

function values(series: BucketValue[]): number[] {
  return series.map(entry => entry.value);
}

function Funnel({ steps }: { steps: { label: string; value: number | null }[] }) {
  const top = Math.max(1, ...steps.map(step => step.value ?? 0));
  return (
    <div className={styles.funnel}>
      {steps.map(step => (
        <div key={step.label} className={styles.step}>
          <span>{step.label}</span>
          <div className={styles.track}><i style={{ width: `${((step.value ?? 0) / top) * 100}%` }} /></div>
          <b>{count(step.value)}</b>
        </div>
      ))}
    </div>
  );
}

function RangeFilter({ current }: { current: StatsRange }) {
  return (
    <nav className={styles.ranges} aria-label="Range">
      {STATS_RANGES.map(option => (
        <a key={option.range} href={`/stats?range=${option.range}`} aria-current={option.range === current ? "page" : undefined}>
          {option.label}
        </a>
      ))}
    </nav>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  const range = parseRange((await searchParams).range);
  const report = await cachedStatsReport(range);
  const rangeLabel = STATS_RANGES.find(option => option.range === range)?.label ?? range;
  const bucketWord = report.granularity === "month" ? "month" : "day";
  const appStore = report.appStore;
  const appStoreRange = appStore ? appStore.units.ios + appStore.units.mac : null;
  const downloadsRange = appStoreRange === null && report.direct === null ? null : (appStoreRange ?? 0) + (report.direct ?? 0);
  const siteClicks = report.siteClicks ? sum(report.siteClicks.map(bucket => bucket.stable + bucket.beta)) : null;
  const macsToday = report.storage === "off" ? null : sum(report.macsToday.map(row => row.macs));
  const visits = report.visits ? sum(values(report.visits)) : null;
  const checkouts = report.storage === "off" ? null : sum(report.checkoutsByPlan.map(plan => plan.count));
  const orders = report.orders ? report.orders.newPaid + report.orders.newFree : null;
  const { allTime } = report;

  return (
    <SiteShell siteMode="personal">
      <ContentPage
        kicker={`stats · ${rangeLabel}, UTC`}
        title="how the cat is doing"
        intro={`downloads, macs checking for updates, visits, checkouts and orders, as totals: ${STORAGE_NOTE[report.storage]} visits come from goatcounter, app store numbers from apple's sales reports, orders from polar, direct downloads from github's own counts. counts only, never money or people. updated every few minutes.`}
      >
      <RangeFilter current={range} />

      <div className={styles.tiles}>
        <Tile headline value={allTime.downloads} label="downloads, all time"
          detail={`App Store ${count(allTime.appStore)} · direct ${count(allTime.direct)}`} />
        <Tile value={downloadsRange} label={`downloads, ${rangeLabel}`}
          detail={`App Store ${count(appStoreRange)} · direct ${count(report.direct)}`} />
        <Tile value={visits} label={`visits, ${rangeLabel}`} />
        <Tile value={checkouts} label={`checkouts started, ${rangeLabel}`} />
        <Tile value={orders} label={`orders, ${rangeLabel}`} />
        <Tile value={macsToday} label="Macs checked for updates today" />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Downloads</h2>
          <p className={styles.note}>
            First-time App Store downloads of Local AI Chat, and direct Mac downloads of the plain DMG, per {bucketWord}.
            Apple publishes a day the next morning, Pacific time{appStore?.latestDay ? `; its latest here is ${bucketLabel(appStore.latestDay)}` : ""}.
            GitHub only keeps running totals, so direct downloads have dates from {bucketLabel(GITHUB_SNAPSHOTS_STARTED)}.
          </p>
          <Bars keys={report.buckets} label={`Downloads per ${bucketWord}`} series={[
            report.downloads.map(bucket => bucket.ios),
            report.downloads.map(bucket => bucket.mac),
            report.downloads.map(bucket => bucket.direct ?? 0)
          ]} />
          <div className={styles.legend}><span>App Store, iPhone and iPad</span><span>App Store, Mac</span><span>direct, Mac</span></div>
          <table className={styles.table} style={{ marginTop: 18 }}>
            <tbody>
              <tr><td>App Store first downloads</td><td>{count(appStoreRange)}</td></tr>
              <tr><td>App Store downloads again</td><td>{count(appStore?.units.redownloads ?? null)}</td></tr>
              <tr><td>App Store updates</td><td>{count(appStore?.units.updates ?? null)}</td></tr>
              <tr><td>App Store in-app purchases</td><td>{count(appStore?.units.purchases ?? null)}</td></tr>
              <tr><td>direct downloads (plain DMG)</td><td>{count(report.direct)}</td></tr>
              <tr><td>site download buttons</td><td>{count(siteClicks)}</td></tr>
            </tbody>
          </table>
          {!appStore && <p className={styles.off} style={{ marginTop: 12 }}>App Store numbers are not connected on this deployment.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Visits</h2>
          <p className={styles.note}>GoatCounter&rsquo;s daily visitors on public pages, per {bucketWord}.</p>
          {report.visits ? <Bars keys={report.buckets} label={`Visits per ${bucketWord}`} series={[values(report.visits)]} />
            : <p className={styles.off}>GoatCounter didn&rsquo;t answer, or no read token is set.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Funnel</h2>
          <p className={styles.note}>
            The site&rsquo;s own path, from a visit to a Polar order. Totals over the range, not the same people followed
            through; download buttons and checkouts are counted from {bucketLabel(COUNTING_STARTED)}.
          </p>
          <Funnel steps={[
            { label: "visits", value: visits },
            { label: "download buttons", value: siteClicks },
            { label: "checkouts started", value: checkouts },
            { label: "orders", value: orders }
          ]} />
          {report.orders ? (
            <table className={styles.table} style={{ marginTop: 18 }}>
              <thead><tr><th>Polar orders</th><th>count</th></tr></thead>
              <tbody>
                <tr><td>paid</td><td>{report.orders.newPaid}</td></tr>
                <tr><td>free (full discount or trial)</td><td>{report.orders.newFree}</td></tr>
                <tr><td>renewals</td><td>{report.orders.renewals}</td></tr>
              </tbody>
            </table>
          ) : <p className={styles.off} style={{ marginTop: 18 }}>Polar didn&rsquo;t answer, or no key is set.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Macs</h2>
          <p className={styles.note}>
            Distinct Macs a day whose app asked for updates through the site{report.granularity === "month" ? "; for a month, its busiest day" : ""}.
            Starts with the first build whose feed is localaicat.com/updates/appcast.xml.
          </p>
          {report.macs ? <Bars keys={report.buckets} label={`Macs per ${bucketWord}`} series={[values(report.macs)]} />
            : <p className={styles.off}>Not counted on this deployment.</p>}
        </section>

        <section className={styles.panel}>
          <h2>By version</h2>
          <p className={styles.note}>Download buttons over the range, and Macs on each version today.</p>
          <table className={styles.table}>
            <thead><tr><th>download</th><th>version</th><th>count</th></tr></thead>
            <tbody>
              {report.downloadsByVersion.length === 0 && <tr><td colSpan={3}>none yet</td></tr>}
              {report.downloadsByVersion.map(row => (
                <tr key={`${row.channel}|${row.version}`}><td>{row.channel}</td><td>{row.version}</td><td>{row.count}</td></tr>
              ))}
            </tbody>
          </table>
          <table className={styles.table} style={{ marginTop: 18 }}>
            <thead><tr><th>app version</th><th>Macs today</th></tr></thead>
            <tbody>
              {report.macsToday.length === 0 && <tr><td colSpan={2}>none yet</td></tr>}
              {report.macsToday.map(row => <tr key={row.version}><td>{row.version}</td><td>{row.macs}</td></tr>)}
            </tbody>
          </table>
          {report.checkoutsByPlan.length > 0 && (
            <table className={styles.table} style={{ marginTop: 18 }}>
              <thead><tr><th>checkouts started</th><th>count</th></tr></thead>
              <tbody>{report.checkoutsByPlan.map(row => <tr key={row.plan}><td>{row.plan}</td><td>{row.count}</td></tr>)}</tbody>
            </table>
          )}
        </section>

        <section className={styles.panel}>
          <h2>All time</h2>
          <p className={styles.note}>
            App Store since launch in February 2025; direct downloads per DMG file as GitHub counts them, since the first
            direct release. The plain DMG is a new install; a versioned DMG is mostly Sparkle updating an installed app.
          </p>
          <table className={styles.table}>
            <tbody>
              <tr><td>App Store first downloads</td><td>{count(allTime.appStore)}</td></tr>
              <tr><td>direct downloads (plain DMG)</td><td>{count(allTime.direct)}</td></tr>
              <tr><td>direct updates (versioned DMG)</td><td>{count(allTime.directUpdates)}</td></tr>
              {report.github?.channels.filter(row => row.channel !== "stable").map(row => (
                <tr key={row.channel}><td>{row.channel} DMGs ({row.releases} releases)</td><td>{row.dmgDownloads}</td></tr>
              ))}
            </tbody>
          </table>
          {report.github ? (
            <table className={styles.table} style={{ marginTop: 18 }}>
              <thead><tr><th>busiest stable</th><th>published</th><th>DMG downloads</th></tr></thead>
              <tbody>
                {report.github.topStable.map(row => (
                  <tr key={row.tag}><td>{row.tag}</td><td>{row.publishedAt ?? "–"}</td><td>{row.dmgDownloads}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className={styles.off} style={{ marginTop: 12 }}>GitHub didn&rsquo;t answer; it allows 60 unauthenticated calls an hour.</p>}
        </section>
      </div>
      </ContentPage>
    </SiteShell>
  );
}
