import type { Metadata } from "next";
import internal from "../internal.module.css";
import styles from "./stats.module.css";
import { loadStatsReport, REPORT_DAYS, type DayValue, type StatsReport } from "../../../lib/site-stats-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stats · Internal · Local AI Cat",
  robots: { index: false, follow: false }
};

const STORAGE_NOTE: Record<StatsReport["storage"], string> = {
  redis: "Counted by the site in Upstash Redis.",
  memory: "Local dev server: counted in memory, gone on restart.",
  off: "Counting is off: no Redis is configured for this deployment."
};

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Tile({ value, label }: { value: number | null; label: string }) {
  return <div className={styles.tile}><b>{value === null ? "–" : value.toLocaleString("en-US")}</b><span>{label}</span></div>;
}

/** One bar per day; a second series stacks on top of the first. */
function DailyBars({ days, primary, secondary, label }: {
  days: string[]; primary: number[]; secondary?: number[]; label: string;
}) {
  const totals = primary.map((value, index) => value + (secondary?.[index] ?? 0));
  const peak = Math.max(1, ...totals);
  return (
    <>
      <div className={styles.bars} role="img" aria-label={`${label}, ${sum(totals)} over ${days.length} days`}>
        {days.map((day, index) => (
          <div key={day} className={styles.bar} title={`${shortDay(day)}: ${totals[index]}`}>
            <i className={styles.primary} style={{ height: `${(primary[index] / peak) * 100}%` }} />
            {secondary && <i className={styles.secondary} style={{ height: `${(secondary[index] / peak) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className={styles.axis}><span>{shortDay(days[0])}</span><span>{shortDay(days[days.length - 1])}</span></div>
    </>
  );
}

function values(series: DayValue[]): number[] {
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
          <b>{step.value === null ? "–" : step.value.toLocaleString("en-US")}</b>
        </div>
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const report = await loadStatsReport();
  const { days } = report;
  const downloads30 = report.downloads ? sum(report.downloads.map(day => day.stable + day.beta)) : null;
  const macsToday = report.macsByDay ? report.macsByDay[report.macsByDay.length - 1].value : null;
  const visits30 = report.visits ? sum(values(report.visits)) : null;
  const checkouts30 = report.storage === "off" ? null : sum(report.checkoutsByPlan.map(plan => plan.count));

  return (
    <>
      <div className={internal.pageHead}>
        <p className={internal.pageEyebrow}>Local AI Cat · Internal · last {REPORT_DAYS} days, UTC</p>
        <h1 className={internal.pageTitle}>Stats.</h1>
        <p className={internal.pageIntro}>
          Downloads, Macs checking for updates, visits and checkouts. {STORAGE_NOTE[report.storage]} Visits come
          from GoatCounter; the history from GitHub&rsquo;s own download counts.
        </p>
      </div>

      <div className={styles.tiles}>
        <Tile value={downloads30} label="Mac downloads" />
        <Tile value={macsToday} label="Macs checked for updates today" />
        <Tile value={visits30} label="visits" />
        <Tile value={checkouts30} label="checkouts started" />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2>Downloads</h2>
          <p className={styles.note}>Clicks on the site&rsquo;s download buttons that went on to GitHub. Link previews are left out.</p>
          {report.downloads ? (
            <>
              <DailyBars days={days} label="Downloads per day" primary={report.downloads.map(day => day.stable)}
                secondary={report.downloads.map(day => day.beta)} />
              <div className={styles.legend}><span>stable</span><span>beta</span></div>
            </>
          ) : <p className={styles.off}>Not counted on this deployment.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Macs</h2>
          <p className={styles.note}>Distinct Macs a day whose app asked for updates through the site. Starts with the first build whose feed is localaicat.com/updates/appcast.xml.</p>
          {report.macsByDay ? <DailyBars days={days} label="Macs per day" primary={values(report.macsByDay)} />
            : <p className={styles.off}>Not counted on this deployment.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Visits</h2>
          <p className={styles.note}>GoatCounter&rsquo;s daily visitors on public pages.</p>
          {report.visits ? <DailyBars days={days} label="Visits per day" primary={values(report.visits)} />
            : <p className={styles.off}>GoatCounter didn&rsquo;t answer, or no read token is set.</p>}
        </section>

        <section className={styles.panel}>
          <h2>Funnel</h2>
          <p className={styles.note}>Totals over the window, not the same people followed through.</p>
          <Funnel steps={[
            { label: "visits", value: visits30 },
            { label: "downloads", value: downloads30 },
            { label: "checkouts started", value: checkouts30 }
          ]} />
        </section>

        <section className={styles.panel}>
          <h2>By version</h2>
          <p className={styles.note}>Downloads over the window, and Macs on each version today.</p>
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
        </section>

        <section className={styles.panel}>
          <h2>GitHub history</h2>
          <p className={styles.note}>All-time DMG downloads per release file, as GitHub counts them. No dates.</p>
          {report.github ? (
            <>
              <table className={styles.table}>
                <thead><tr><th>channel</th><th>releases</th><th>DMG downloads</th></tr></thead>
                <tbody>
                  {report.github.channels.map(row => (
                    <tr key={row.channel}><td>{row.channel}</td><td>{row.releases}</td><td>{row.dmgDownloads}</td></tr>
                  ))}
                </tbody>
              </table>
              <table className={styles.table} style={{ marginTop: 18 }}>
                <thead><tr><th>busiest stable</th><th>published</th><th>DMG downloads</th></tr></thead>
                <tbody>
                  {report.github.topStable.map(row => (
                    <tr key={row.tag}><td>{row.tag}</td><td>{row.publishedAt ?? "–"}</td><td>{row.dmgDownloads}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <p className={styles.off}>GitHub didn&rsquo;t answer; it allows 60 unauthenticated calls an hour.</p>}
          {report.checkoutsByPlan.length > 0 && (
            <table className={styles.table} style={{ marginTop: 18 }}>
              <thead><tr><th>checkouts started</th><th>count</th></tr></thead>
              <tbody>{report.checkoutsByPlan.map(row => <tr key={row.plan}><td>{row.plan}</td><td>{row.count}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
