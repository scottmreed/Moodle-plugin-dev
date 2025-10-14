Moodle Plugin Development Guidelines
===================================

1. Plan the plugin type and scope
   - Pick the plugin type that matches the feature you want (e.g., activity modules `mod`, blocks `block`, local plugins `local`, enrolment plugins `enrol`).
   - Follow Moodle's Frankenstyle naming (`type_name`) and machine-name rules: start with a lowercase letter, use only lowercase letters/numbers/underscores, avoid double underscores, end with letter/number.
   - Document both the friendly name (for users) and the component name (for code and directory structure).

2. Scaffold required plugin files early
   - Start from the standard plugin skeleton so you have `version.php`, `db/access.php`, language strings (`lang/en`), settings, renderer, privacy provider, and tests in place.
   - Keep shared plugin files consistent across types (see Moodle "Plugin files" docs) so auto-upgrades and administration tools recognize the plugin.
   - Maintain `db/services.php`, `db/mobile.php`, and `db/events.php` only when needed—unused files should be omitted.

3. Add Moodle App (mobile) support intentionally
   - Create `db/mobile.php` to declare handlers that extend specific Moodle App delegates (e.g., `CoreMainMenuDelegate`, `CoreCourseFormatDelegate`).
   - Implement the exported PHP callbacks in the reserved `\{component}\output\mobile` namespace, returning arrays with `templates`, `javascript`, and `otherdata` as required.
   - Rely on the core `tool_mobile_get_content` service; write plain PHP returning Mustache output instead of custom web services unless advanced functionality demands it.

4. Build mobile templates with Ionic-friendly components
   - Render templates with `$OUTPUT->render_from_template()` and switch Mustache delimiters (`{{=<% %>=}}`) to avoid clashing with Angular's `{{ }}` syntax.
   - Use Ionic and Moodle App components/directives instead of Bootstrap; reference the Site Plugins UI API for layout, navigation, and actions.
   - Keep templates modular (`templates/` directory) and provide corresponding language strings via `lang/en/{component}.php` for localization.

5. Manage data flow, caching, and versioning
   - Expect handlers to receive contextual data (`userid`, `courseid`, `cmid`, app version, language) and shape responses accordingly.
   - Understand that static templates are cached at login, whereas dynamic templates run on each view—choose the mode that fits the data.
   - After backend changes, refresh the browser or pull-to-refresh; purge caches or bump `version.php` when updates fail to appear.

6. Respect Moodle capability, privacy, and security standards
   - Always check capabilities before exposing data or actions; reuse Moodle APIs for database access, files, and events.
   - Sanitize all output, avoid direct SQL without Moodle's database layer, and declare stored data in the privacy provider if the plugin keeps personal data.
   - Keep JavaScript minimal and scoped; prefer Moodle-provided services for network requests and avoid leaking tokens or sensitive data.

7. Test iteratively across environments
   - Use hosted Moodle App instances (`latest.apps.moodledemo.net`, `main.apps.moodledemo.net`), Docker images, or native builds to validate UI/UX.
   - Exercise plugin workflows both in the LMS web interface and the app to ensure consistent behavior and graceful fallbacks.
   - Log errors, monitor the browser console/network inspector, and use Moodle debugging modes to surface integration issues early.

8. Prepare for release and maintenance
   - Keep documentation (README, upgrade notes) alongside the plugin; describe required Moodle version and dependencies.
   - Increment the plugin version for every release, provide upgrade steps, and test install/upgrade paths.
   - Engage with the Moodle community (forums, Matrix rooms) when you need new delegate extension points or to share feedback.
