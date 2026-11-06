import { readFileSync } from "node:fs";
import { isRecord } from "./state";

export type Sources = { tier1: string[]; tier2: string[] };

export type FactRules = { min_source_tier: number; recheck_after_days: number; unconfirmed_wording: string };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const loadSources = (): Sources => {
  const parsed: unknown = JSON.parse(readFileSync("config/sources.json", "utf8"));
  if (!isRecord(parsed) || !isStringArray(parsed.tier1) || !isStringArray(parsed.tier2)) {
    throw new Error("Invalid config/sources.json");
  }
  return { tier1: parsed.tier1, tier2: parsed.tier2 };
};

export const loadFactRules = (): FactRules => {
  const parsed: unknown = JSON.parse(readFileSync("config/rules.json", "utf8"));
  if (!isRecord(parsed) || !isRecord(parsed.facts)) throw new Error("Invalid config/rules.json");
  const { min_source_tier, recheck_after_days, unconfirmed_wording } = parsed.facts;
  if (typeof min_source_tier !== "number" || typeof recheck_after_days !== "number") {
    throw new Error("config/rules.json: facts.min_source_tier and facts.recheck_after_days are required");
  }
  return { min_source_tier, recheck_after_days, unconfirmed_wording: String(unconfirmed_wording ?? "") };
};

const matches = (url: URL, entry: string): boolean =>
  entry.includes("/") ? `${url.hostname}${url.pathname}`.startsWith(entry) : url.hostname === entry;

export const tierOf = (rawUrl: string, sources: Sources): 1 | 2 | undefined => {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") return undefined;
  if (sources.tier1.some((entry) => matches(url, entry))) return 1;
  if (sources.tier2.some((entry) => matches(url, entry))) return 2;
  return undefined;
};
