#!/usr/bin/env node
// Calls the site's /api/health/billing and exits non-zero when any check fails, for the
// weekly launchd job.
//
// Usage: node scripts/billing-health.mjs [--url https://localaicat.com/api/health/billing]
// Token: $BILLING_HEALTH_TOKEN, else the macOS keychain item "localaicat-billing-health".
// Exit: 0 every check passed · 1 a check failed · 2 the check could not run.
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_URL = "https://localaicat.com/api/health/billing";
const KEYCHAIN_SERVICE = "localaicat-billing-health";
const REQUEST_TIMEOUT_MS = 60_000;

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_UNAVAILABLE = 2;

export function parseUrl(argv) {
  const index = argv.indexOf("--url");
  return index >= 0 && argv[index + 1] ? argv[index + 1] : DEFAULT_URL;
}

function readToken(env) {
  if (env.BILLING_HEALTH_TOKEN) return env.BILLING_HEALTH_TOKEN;
  try {
    return execFileSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}

/** One line per check, failures first; returns the exit code. */
export function summarize(status, report) {
  if (!report || typeof report.checks !== "object" || report.checks === null) {
    return { code: EXIT_UNAVAILABLE, lines: [`billing health: the site answered ${status} without a report`] };
  }
  const entries = Object.entries(report.checks).sort(([, left], [, right]) => Number(left.ok) - Number(right.ok));
  const lines = entries.map(([name, check]) => `${check.ok ? "ok  " : "FAIL"} ${name}: ${check.detail}`);
  const ok = report.ok === true && entries.every(([, check]) => check.ok);
  lines.unshift(`billing health ${ok ? "ok" : "FAILED"} (${report.checkedAt ?? "unknown time"})`);
  return { code: ok ? EXIT_OK : EXIT_FAILED, lines };
}

export async function main(argv = process.argv.slice(2), env = process.env, fetchImpl = fetch) {
  const url = parseUrl(argv);
  const token = readToken(env);
  if (!token) {
    console.error(`billing health: no token (set BILLING_HEALTH_TOKEN or the "${KEYCHAIN_SERVICE}" keychain item)`);
    return EXIT_UNAVAILABLE;
  }
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "localaicat-billing-health-job/1" },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    console.error(`billing health: ${url} unreachable: ${error instanceof Error ? error.message : error}`);
    return EXIT_UNAVAILABLE;
  }
  if (response.status === 401 || response.status === 404) {
    console.error(`billing health: ${url} answered ${response.status}; the token or BILLING_HEALTH_TOKEN env is wrong`);
    return EXIT_UNAVAILABLE;
  }
  const report = await response.json().catch(() => null);
  const { code, lines } = summarize(response.status, report);
  for (const line of lines) (code === EXIT_OK ? console.log : console.error)(line);
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
