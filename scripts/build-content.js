// Compiles the CMS-managed source files (content/settings/*.json, one file
// per product in content/products/*.json — a Decap CMS "folder" collection)
// into the two flat files js/content.js actually fetches at runtime:
// data/settings.json and data/products.json.
//
// Why this exists at all: a static site can't ask its host "list every
// file in content/products/" at page-load time — there's no server to
// answer that. Decap needs one-file-per-product for its collection UI
// (add/edit/delete entries), so something has to reduce that folder to a
// single array the browser can actually fetch. This script is that
// something, and it's meant to run on every deploy (see package.json's
// "build" script / netlify.toml) so a CMS edit always ends up published.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SETTINGS_DIR = join(ROOT, "content", "settings");
const PRODUCTS_DIR = join(ROOT, "content", "products");
const DATA_DIR = join(ROOT, "data");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function buildSettings() {
  const settings = {};
  for (const filename of readdirSync(SETTINGS_DIR)) {
    if (!filename.endsWith(".json")) continue;
    const key = filename.replace(/\.json$/, "");
    settings[key] = readJson(join(SETTINGS_DIR, filename));
  }
  return settings;
}

function buildProducts() {
  const products = [];
  for (const filename of readdirSync(PRODUCTS_DIR)) {
    if (!filename.endsWith(".json")) continue;
    const slug = filename.replace(/\.json$/, "");
    products.push({ slug, ...readJson(join(PRODUCTS_DIR, filename)) });
  }
  products.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return products;
}

const settings = buildSettings();
const products = buildProducts();

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(join(DATA_DIR, "settings.json"), JSON.stringify(settings, null, 2));
writeFileSync(join(DATA_DIR, "products.json"), JSON.stringify(products, null, 2));

console.log(`Contenu compilé : data/settings.json, data/products.json (${products.length} produit(s)).`);
