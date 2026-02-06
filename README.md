# System Articles Repository — Wikipefia

This is the **system articles content repository** for [Wikipefia](https://github.com/org/wikipefia). System articles are standalone pages that don't belong to any subject or teacher — things like semester overviews, getting started guides, FAQ, and university-wide announcements.

## Quick Start

1. **Add an article** to `config.json` with its slug, route, name, and keywords.
2. **Write the MDX** in `articles/{locale}/{slug}.mdx` for each locale.
3. **Push to main** → the site rebuilds automatically with the new content.

## Repository Structure

```
system-articles-repo-template/
├── config.json                         # Registry of all system articles
├── articles/
│   ├── en/
│   │   ├── semester-1-overview.mdx     # Pinned article
│   │   ├── getting-started.mdx         # Guide for new students
│   │   └── faq.mdx                     # Frequently asked questions
│   ├── ru/
│   │   ├── semester-1-overview.mdx
│   │   ├── getting-started.mdx
│   │   └── faq.mdx
│   └── cz/
│       ├── semester-1-overview.mdx
│       └── getting-started.mdx
├── scripts/
│   └── validate-content.ts            # Validates config + articles
├── package.json
├── tsconfig.json
└── .github/
    └── workflows/
        ├── validate.yml               # CI: validates content on PRs
        └── notify-main.yml            # CD: triggers main repo rebuild
```

## Config Schema

`config.json` contains an `articles` array. Each entry has:

| Field | Type | Required | Description |
|---|---|---|---|
| `slug` | `string` | Yes | URL-safe identifier. Becomes the route: `/<slug>`. |
| `route` | `string` | Yes | Full route path (must start with `/`). Usually `/<slug>`. |
| `name` | `LocalizedString` | Yes | Display name in all locales. |
| `description` | `LocalizedString` | No | Short description in all locales. |
| `keywords` | `LocalizedKeywords` | Yes | Search keywords per locale. |
| `pinned` | `boolean` | No | If `true`, shows on the home page. Default: `false`. |
| `order` | `number` | No | Sort priority for pinned articles. Lower = higher priority. |

## System Article MDX

System articles use a simplified frontmatter — just `title`, `slug`, `keywords`, and `created`/`updated`. No `author`, `difficulty`, or `prerequisites` needed (though they're allowed by the schema).

All standard MDX components are available (Callout, Tabs, Quiz, etc.).

## CI/CD

- **`validate.yml`**: Validates `config.json` schema, checks all referenced articles exist, validates frontmatter.
- **`notify-main.yml`**: Triggers main repo rebuild on push to main.

## Local Development

```bash
pnpm install
pnpm validate
```
