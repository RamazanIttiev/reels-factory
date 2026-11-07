import { icons } from "lucide-react";
import * as simple from "simple-icons";
import { isHookIcon } from "./hookIcons";

export type BrandIcon = { slug: string; title: string; path: string; hex: string };

const isBrand = (value: unknown): value is BrandIcon =>
  typeof value === "object" && value !== null && "slug" in value && "path" in value && "hex" in value && "title" in value;

const brands: Record<string, BrandIcon> = Object.fromEntries(
  Object.values(simple)
    .filter(isBrand)
    .map((brand) => [brand.slug, brand]),
);

export const BRAND_PREFIX = "brand:";

const pascal = (name: string): string =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

export const lucideComponent = (name: string) => {
  const component = icons[pascal(name) as keyof typeof icons];
  return component ?? undefined;
};

export const brandIcon = (name: string): BrandIcon | undefined =>
  name.startsWith(BRAND_PREFIX) ? brands[name.slice(BRAND_PREFIX.length)] : undefined;

export const isKnownIcon = (name: string): boolean =>
  isHookIcon(name) || brandIcon(name) !== undefined || lucideComponent(name) !== undefined;

const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export const searchIcons = (query: string, limit = 25): string[] => {
  const needle = query.toLowerCase();
  const lucide = Object.keys(icons).map(kebab).filter((name) => name.includes(needle));
  const brand = Object.values(brands)
    .filter((entry) => entry.slug.includes(needle) || entry.title.toLowerCase().includes(needle))
    .map((entry) => `${BRAND_PREFIX}${entry.slug}`);
  return [...brand, ...lucide].slice(0, limit);
};
