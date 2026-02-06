#!/usr/bin/env node
/**
 * validate-content.ts — Content validation for the system articles repository.
 *
 * Validates:
 *   1. config.json against SystemConfig schema
 *   2. All articles referenced in config exist as MDX files
 *   3. MDX frontmatter (title, slug, keywords, created)
 *   4. Slug matches filename
 *   5. No duplicate slugs or routes
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { z } from "zod/v4";
import matter from "gray-matter";

// ── Constants ──────────────────────────────────────────

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "config.json");
const ARTICLES_DIR = path.join(ROOT, "articles");
const LOCALES = ["ru", "en", "cz"] as const;

// ── Zod Schemas ────────────────────────────────────────

const LocalizedString = z.object({
  ru: z.string(),
  en: z.string(),
  cz: z.string(),
});

const LocalizedKeywords = z.object({
  ru: z.array(z.string()),
  en: z.array(z.string()),
  cz: z.array(z.string()),
});

const SystemArticleEntry = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  route: z.string().startsWith("/"),
  name: LocalizedString,
  description: LocalizedString.optional(),
  keywords: LocalizedKeywords,
  pinned: z.boolean().default(false),
  order: z.number().optional(),
});

const SystemConfig = z.object({
  articles: z.array(SystemArticleEntry),
});

// Simple frontmatter validation for system articles
const SystemArticleFrontmatter = z.object({
  title: LocalizedString,
  slug: z.string().regex(/^[a-z0-9_-]+$/),
  keywords: LocalizedKeywords,
  created: z.string(),
  updated: z.string().optional(),
  // System articles may optionally have these
  author: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedReadTime: z.number().optional(),
});

// ── Utilities ──────────────────────────────────────────

let errorCount = 0;
let warnCount = 0;

function logError(msg: string) {
  console.error(`  ✗ ERROR: ${msg}`);
  errorCount++;
}

function logWarn(msg: string) {
  console.warn(`  ⚠ WARN:  ${msg}`);
  warnCount++;
}

function logOk(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function listMdxFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(
    (f) => f.endsWith(".mdx") && statSync(path.join(dir, f)).isFile()
  );
}

// ── Step 1: Validate config.json ───────────────────────

function validateConfig(): z.infer<typeof SystemConfig> | null {
  console.log("\n▸ Validating config.json...");

  if (!existsSync(CONFIG_PATH)) {
    logError("config.json not found");
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (e) {
    logError(`config.json is not valid JSON: ${e}`);
    return null;
  }

  const result = SystemConfig.safeParse(raw);
  if (!result.success) {
    logError("config.json schema validation failed:");
    for (const issue of result.error.issues) {
      logError(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    return null;
  }

  logOk(`config.json valid (${result.data.articles.length} articles registered)`);

  // Check for duplicate slugs
  const slugs = new Set<string>();
  const routes = new Set<string>();
  for (const article of result.data.articles) {
    if (slugs.has(article.slug)) {
      logError(`Duplicate slug: "${article.slug}"`);
    }
    slugs.add(article.slug);

    if (routes.has(article.route)) {
      logError(`Duplicate route: "${article.route}"`);
    }
    routes.add(article.route);
  }

  return result.data;
}

// ── Step 2: Validate structure ─────────────────────────

function validateStructure(): void {
  console.log("\n▸ Validating repository structure...");

  if (!existsSync(ARTICLES_DIR)) {
    logError("articles/ directory not found");
    return;
  }

  const localeDirs = LOCALES.filter((l) =>
    existsSync(path.join(ARTICLES_DIR, l))
  );

  if (localeDirs.length === 0) {
    logError("No locale directories found in articles/");
    return;
  }

  logOk(`Found locale directories: ${localeDirs.join(", ")}`);
}

// ── Step 3: Validate frontmatter ───────────────────────

function validateFrontmatter(): void {
  console.log("\n▸ Validating MDX frontmatter...");

  for (const locale of LOCALES) {
    const localeDir = path.join(ARTICLES_DIR, locale);
    if (!existsSync(localeDir)) continue;

    const files = listMdxFiles(localeDir);
    for (const file of files) {
      const filePath = path.join(localeDir, file);
      const raw = readFileSync(filePath, "utf-8");

      let parsed;
      try {
        parsed = matter(raw);
      } catch (e) {
        logError(`articles/${locale}/${file}: Failed to parse frontmatter: ${e}`);
        continue;
      }

      const result = SystemArticleFrontmatter.safeParse(parsed.data);
      if (!result.success) {
        logError(`articles/${locale}/${file}: Frontmatter validation failed:`);
        for (const issue of result.error.issues) {
          logError(`  ${issue.path.join(".")}: ${issue.message}`);
        }
        continue;
      }

      // Check slug matches filename
      const expectedSlug = path.basename(file, ".mdx");
      if (result.data.slug !== expectedSlug) {
        logError(
          `articles/${locale}/${file}: slug "${result.data.slug}" ` +
            `does not match filename "${expectedSlug}"`
        );
        continue;
      }

      logOk(`articles/${locale}/${file} — valid`);
    }
  }
}

// ── Step 4: Cross-validate config ↔ articles ───────────

function crossValidate(config: z.infer<typeof SystemConfig>): void {
  console.log("\n▸ Cross-validating config.json ↔ articles...");

  // Collect all article slugs from all locales
  const allArticleSlugs = new Set<string>();
  for (const locale of LOCALES) {
    const localeDir = path.join(ARTICLES_DIR, locale);
    if (!existsSync(localeDir)) continue;
    for (const f of listMdxFiles(localeDir)) {
      allArticleSlugs.add(path.basename(f, ".mdx"));
    }
  }

  // Check each registered article has at least one MDX file
  for (const article of config.articles) {
    if (allArticleSlugs.has(article.slug)) {
      // Check which locales have it
      const availableLocales = LOCALES.filter((l) =>
        existsSync(path.join(ARTICLES_DIR, l, `${article.slug}.mdx`))
      );
      logOk(
        `"${article.slug}" exists in: ${availableLocales.join(", ")}`
      );
    } else {
      logError(
        `Article "${article.slug}" registered in config.json but no MDX file found in any locale`
      );
    }
  }

  // Warn about MDX files not registered in config
  const registeredSlugs = new Set(config.articles.map((a) => a.slug));
  for (const slug of allArticleSlugs) {
    if (!registeredSlugs.has(slug)) {
      logWarn(
        `MDX file "${slug}" exists but is not registered in config.json articles array`
      );
    }
  }
}

// ── Main ───────────────────────────────────────────────

function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  WIKIPEFIA SYSTEM ARTICLES VALIDATOR         ║");
  console.log("╚══════════════════════════════════════════════╝");

  const config = validateConfig();
  validateStructure();
  validateFrontmatter();

  if (config) {
    crossValidate(config);
  }

  // Summary
  console.log("\n" + "─".repeat(48));
  if (errorCount > 0) {
    console.error(
      `\n✗ Validation FAILED: ${errorCount} error(s), ${warnCount} warning(s)\n`
    );
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(`\n✓ Validation passed with ${warnCount} warning(s)\n`);
  } else {
    console.log("\n✓ Validation passed — all checks green!\n");
  }
}

main();
