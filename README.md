# Moodle Plugin Kickoff

This repository captures the starting point for building a Moodle plugin, with a focus on aligning web and Moodle App (mobile) experiences.

## Goals
- Choose an appropriate plugin type and follow Moodle's naming and file layout conventions.
- Bootstrap the mandatory plugin files early so installation, upgrades, and privacy checks run smoothly.
- Plan for Moodle App support from the outset by defining mobile handlers and templates.

## Getting Started
1. Review `AGENTS.md` (or `.cursor/rules`) for development standards distilled from the Moodle developer documentation.
2. Decide which plugin type (`mod`, `block`, `local`, etc.) matches your feature and create the directory structure using the Moodle plugin skeleton.
3. Add `db/mobile.php` and matching PHP callbacks under `classes/output/mobile` when mobile support is required.
4. Build Mustache templates that leverage Ionic components for the Moodle App, and keep language strings in `lang/en/` for localization.
5. Test iteratively in both the Moodle LMS and the Moodle App (browser or hosted builds) and purge caches or bump `version.php` when updates are missed.

## Prompt Suggestions
- "Audit my Moodle plugin scaffold and point out any missing mandatory files before first install."
- "Generate a `db/mobile.php` handler that adds a menu item via `CoreMainMenuDelegate` for component `local_example`."
- "Rewrite this Mustache template for the Moodle App to avoid Angular delimiter conflicts and use Ionic list items."
- "Suggest test scenarios to validate cache invalidation and version bump behavior after updating handlers."
- "Explain when to choose an `enrol` plugin instead of a `tool` plugin for managing course access flows."

## Reference Material
- Moodle App Plugins Development Guide: <https://moodledev.io/general/app/development/plugins-development-guide>
- Moodle Plugin Types: <https://moodledev.io/docs/4.1/apis/plugintypes>
