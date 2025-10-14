Moodle Plugin Development Guidelines
===================================

1. Plan the plugin type and architecture
   - Select the plugin type that matches the feature (e.g., `mod`, `block`, `local`, `enrol`) and record both the friendly name and Frankenstyle component (`type_name`).
   - Map the PHP surface (capabilities, events, settings) and the Node/JavaScript surface (widgets, reactive flows) before coding so server and client concerns stay aligned.
   - Verify naming rules: start with a lowercase letter, use only lowercase letters/numbers/underscores, avoid double underscores, end with letter/number (activity modules disallow underscores).

2. Scaffold core plugin files early
   - Start from Moodle's plugin skeleton to create `version.php`, `db/access.php`, `db/services.php`, `db/mobile.php`, language strings (`lang/en`), settings, renderer, privacy provider, tests, and `classes/` namespaces.
   - Keep optional files (`db/events.php`, `db/install.xml`, `db/upgrade.php`) as documented placeholders when not yet populated so future changes slot in without refactors.
   - Track `version.php` requirements (`$plugin->component`, `$plugin->version`, `$plugin->requires`, `$plugin->dependencies`) even if values are stubbed during inception.

3. Configure MDK and Node tooling
   - Use the Moodle Developer Kit (`mdk`) for environment automation (e.g., `mdk init`, `mdk sync`, `mdk run behat`, `mdk run phpunit`, `mdk plugins create`) to script repetitive admin tasks.
   - Manage JavaScript dependencies with `npm`/`yarn` inside your plugin; run `grunt amd` (or `mdk run grunt amd`) to rebuild AMD modules after editing `amd/src/*.js`.
   - Document custom build steps or Node scripts in `package.json` to keep CI and contributors aligned; avoid committing build artefacts when the pipeline can regenerate them.

4. Write JavaScript as ES2015 AMD modules
   - Place code in `amd/src/` directories and export from `amd/build/` via Moodle's build chain; name modules `component/local/...` using Moodle naming conventions.
   - Prefer standard language features, the Fetch API, and Moodle core helpers (`core/str`, `core/templates`, `core/notification`, `core/url`, `core/modal`) instead of jQuery or legacy YUI.
   - Avoid `core/ajax` for new code when a REST or fetch workflow suffices; if web service calls are required, wrap them in thin utilities and handle promises with async/await.
   - Isolate selectors, string constants, and capability flags to keep modules testable; expose pure functions for business logic and drive DOM updates via reactive components or templates.

5. Build reactive interfaces with Moodle's reactive library
   - Use `core/reactive` BaseComponent and ReactiveState to create React-style components without additional frameworks.
   - Compose UI from small components, register state watchers via `getWatchers()`, and mutate state through explicit actions to keep the data flow predictable.
   - Initialise components from Mustache via the `{{#js}}` block and `require([...], component => component.init(...))`; pass selectors so templates can customise markup without changing logic.
   - Encourage accessibility and performance by re-rendering only when state changes, memoising expensive selectors, and cleaning up in the `destroy()` lifecycle hook.

6. Design Mustache templates intentionally
   - Store templates under `templates/` (with optional `local/` subdirectories), include the Moodle GPL header, and describe required context, classes, and data attributes in comments.
   - Keep templates logic-free: pass fully prepared data, rely on sections (`{{# }}`, `{{^ }}`), and reuse helpers (`{{#str}}`, `{{#pix}}`, `{{#userdate}}`, `{{#shortentext}}`).
   - Generate unique IDs with `{{uniqid}}` when hooking JavaScript, and switch delimiters (`{{=<% %>=}}`) in mobile templates to avoid Angular collisions.
   - Allow themes to override templates; avoid hard-coded styles by leaning on Bootstrap utilities and context data instead of inline CSS.

7. Adopt Bootstrap 5-first styling
   - Use Bootstrap 5 utility classes (`d-flex`, `row-cols-*`, `mb-3`) rather than deprecated BS4 helpers (`.form-group`, `.card-deck`, `.btn-block`).
   - Replace jQuery-dependent components with BS5-compatible patterns (e.g., `data-bs-toggle`, Popper 2 tooltips) and remove legacy `.input-group-append` markup.
   - Keep SCSS overrides small, follow the BS5 bridge guidance, and plan to remove temporary compatibility shims once core drops BS4 support.
   - Test themes across viewport sizes, ensuring custom styles respect the new CSS variables and spacing scale.

8. Integrate Moodle App (mobile) support as needed
   - Declare app handlers in `db/mobile.php`, mapping to delegates like `CoreMainMenuDelegate` or `CoreCourseFormatDelegate` and supply language strings for UI text.
   - Implement handler callbacks under `\{component}\output\mobile` returning arrays with `templates`, `javascript`, and `otherdata` keys.
   - Render Mustache mobile templates with Ionic-friendly markup and ensure dynamic data is pulled via contextual arguments (`userid`, `courseid`, `cmid`).

9. Manage data flow, caching, and versioning
   - Respect the difference between static (cached) and dynamic templates when tailoring responses for mobile or web.
   - Purge caches (`mdk run php admin/cli/purge_caches.php`) or bump `version.php` when behaviour changes; document manual refresh steps if automation is not possible.
   - Use Moodle's APIs for database, capabilities, events, and file storage; encapsulate external calls in services that can be mocked during tests.

10. Enforce capability, privacy, and security standards
   - Check capabilities before exposing data or actions, and sanitize output via Moodle renderers/format_text helpers.
   - Declare data collection in the privacy provider, extend metadata when storing personal data, and remove unused retention logic.
   - Scope JavaScript tokens carefully, prefer sesskey-protected endpoints, and avoid embedding secrets in templates or local storage.

11. Test iteratively across platforms
   - Exercise workflows via Moodle web UI, Moodle App (hosted builds or local), and automated suites (`mdk run phpunit`, `mdk run behat`, JS unit tests via `grunt karma`).
   - Inspect browser consoles and network logs; enable Moodle debugging and watch for reactive state warnings or BS5 deprecation notices.
   - Include fixture data and sample templates for QA parity across PHP, Node, and mobile surfaces.

12. Prepare documentation and releases
   - Maintain README, CHANGELOG, and upgrade steps; describe supported Moodle versions, dependency ranges, and required cron/webservice configuration.
   - Tag releases after bumping `version.php`, and coordinate with the Moodle community (forums, Matrix) when requesting new delegate extension points or sharing feedback.

MCP Server Usage Notes
----------------------
- Purpose: exposes the Moodle 4.5 API catalogue via MCP resources/tools so agents can cite official guidance during planning and reviews.
- Preferred flow:
  1. Run `npm run generate:apis` inside `mcp-server/` after Moodle docs change.
  2. Start the server with `npm start` (stdio) or `npm run start:http` for HTTP.
  3. Use `npm run verify:mcp` to confirm connectivity before delegating work to agents.
- Resource URIs:
  - `moodleapi://catalog` – category overview used for discovery prompts.
  - `moodleapi://api/{slug}` – detailed entry for a specific API (slug, anchor ID, or title).
  - `moodleapi://category/{categoryId}` – filtered API lists by documentation section.
- MCP Tools:
  - `lookup_api` – resolve a single API when you know the slug/anchor/title snippet.
  - `search_apis` – keyword search with optional category filter; returns summaries plus reference counts.
- Recommended usage moments:
  - Before scoping a feature, pull relevant API entries to capture required callbacks/capabilities.
  - During code review, compare implementation decisions against the returned summary/reference URLs.
  - When scripting automation (Cursor/Claude), connect the agent to the local MCP server for grounded responses.
