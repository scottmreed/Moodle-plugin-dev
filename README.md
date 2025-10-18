# Moodle Plugin Kickoff

This repository captures the starting point for building a Moodle plugin across PHP, Node, and Moodle App surfaces while staying aligned with the official developer guidance. The local stack is built around **Moodle 5.0.3+ (Build: 20251017)**.

## Goals
- Choose an appropriate plugin type and follow Moodle's naming/file layout conventions.
- Bootstrap both PHP and JavaScript scaffolding early so upgrades, testing, and packaging stay predictable.
- Plan for Moodle App and reactive web support from the outset by defining mobile handlers, Mustache templates, and AMD modules.

## Getting Started
1. Review `AGENTS.md` (or `.cursor/rules`) for the consolidated development standards distilled from the Moodle documentation.
2. Follow `docs/local-environment.md` to provision the Moodle 5 environment (Docker Postgres, PHP 8.3, Node 22, MDK).
3. Create a plugin skeleton with MDK (`mdk plugins create --name=type_name`) or clone an existing skeleton, then wire in required Moodle files (`version.php`, `db/access.php`, `lang/en/*.php`, etc.).
4. Install Node tooling inside your plugin folder (`npm install`) and add scripts (e.g., `npm run lint`, `npm run build`) that call Moodle's `grunt amd` build where needed.
5. Develop JavaScript in `amd/src/`, transpile with `grunt amd`, and initialise components via Mustache `{{#js}}` blocks.
6. Add `db/mobile.php` and matching PHP callbacks under `classes/output/mobile` when mobile support is required, then test via hosted Moodle App builds.
7. Purge caches with `/opt/homebrew/opt/php@8.3/bin/php admin/cli/purge_caches.php` (or bump `version.php`) after changing handlers, templates, or capabilities.

## MDK & Node Workflow Essentials
- Assume `pipx install moodle-sdk` has already been executed so the `mdk` CLI is available on your PATH.
- `mdk init` / `mdk sync` — spin up and update a local Moodle instance for integration testing.
- `mdk plugins create` — scaffold new plugins with boilerplate PHP files and directory structure.
- `mdk run grunt amd` — rebuild AMD modules after editing JavaScript (wrap in an npm script for convenience).
- `mdk run phpunit` / `mdk run behat` — execute automated test suites against your plugin.
- `/opt/homebrew/opt/php@8.3/bin/php admin/cli/purge_caches.php` — clear Moodle caches when UI or language updates fail to appear.

## JavaScript & UI Reminders
- Author ES2015 modules, avoid jQuery and legacy AJAX helpers, and rely on the Fetch API plus Moodle core modules (`core/reactive`, `core/templates`, `core/notification`).
- Compose reactive interfaces with `core/reactive` components when you need React-style state management without external dependencies.
- Keep Mustache templates logic-free, describe required context in comments, and use helpers (`{{#str}}`, `{{#pix}}`, `{{#userdate}}`, `{{uniqid}}`) to keep data and presentation clean.
- Style with Bootstrap 5 utility classes and remove deprecated Bootstrap 4 patterns (`.form-group`, `.card-deck`, `.btn-block`).

## Available Plugin Scaffolds
- `block_graphcalc/` — Graphing calculator block with Mustache/AMD UI, renderer, privacy provider, placeholders for mobile handlers, and documentation under `docs/`.

## Prompt Suggestions
- "Audit my Moodle plugin scaffold and point out any missing mandatory PHP or AMD files before first install."
- "Generate a `core/reactive` component that renders data from `tool_mobile_get_content` using Ionic-friendly markup."
- "Rewrite this Mustache template for BS5 utility classes and provide matching selectors for the JS module."
- "Suggest an npm + `mdk` workflow for rebuilding AMD modules and running tests automatically on save."
- "Explain when to choose a reactive component over a simple template-only enhancement."

## Reference Material
- Moodle App Plugins Development Guide: <https://moodledev.io/docs/5.0/general/app/development/plugins-development-guide>
- Moodle Plugin Types: <https://moodledev.io/docs/5.0/apis/plugintypes>
- JavaScript in Moodle: <https://moodledev.io/docs/5.0/guides/javascript>
- Creating a Reactive UI: <https://moodledev.io/docs/5.0/guides/javascript/reactive>
- Mustache Templates: <https://moodledev.io/docs/5.0/guides/templates>
- Bootstrap 5 Migration Guidance: <https://moodledev.io/docs/5.0/guides/bs5migration>

## MCP Server for Moodle 5 APIs
The `mcp-server/` workspace hosts a Model Context Protocol server that mirrors the Moodle 5.0 API catalogue for research, scaffolding, and agent automation.

- **When to use it**
  - Before designing a feature, query `lookup_api` for the definitive Moodle 5.0 guidance on any subsystem.
  - During implementation reviews, pull `moodleapi://api/{slug}` to confirm required callbacks, settings, or capability checks.
  - While pairing with MCP-aware agents (Cursor, Claude Desktop, etc.), point them at this server so suggestions stay aligned with the official docs.
- **Resources**
  - `moodleapi://catalog` summarises APIs by category.
  - `moodleapi://api/{slug}` returns JSON + Markdown for a specific API entry (slug, anchor ID, or title).
  - `moodleapi://category/{categoryId}` groups APIs following Moodle’s documentation hierarchy.
- **Tools**
  - `lookup_api` fetches a single entry by slug, anchor ID, or title snippet.
  - `search_apis` filters APIs by keyword and optional category, returning brief summaries.
- **Setup workflow**
  1. `cd mcp-server`
  2. `npm install`
  3. `npm run generate:apis` to refresh data from <https://moodledev.io/docs/5.0/apis> (re-run when Moodle updates the catalogue).
- **Running the server**
  - `npm start` launches an stdio MCP server (ideal for direct MCP integrations).
  - `npm run start:http` serves HTTP on `POST /mcp`; override host/port with `--host`/`--port` or `HOST`/`PORT`.
  - `npm run verify:mcp` performs a handshake smoke-test and prints available resources/tooling.
