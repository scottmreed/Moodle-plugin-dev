# block_graphcalc

Graphing calculator block for Moodle 4.5 that lets learners evaluate expressions and preview graphs without leaving the activity page. The calculator runs entirely in the browser — no inputs are stored in Moodle.

## Features
- Real-time evaluation of expressions written in terms of `x` using the block UI.
- Responsive SVG graph that updates automatically when the expression, domain, or sample density changes.
- Compatible with course pages, dashboards, and quizzes (set "Display on page types" to "Any page" in block settings to surface it during quiz attempts).

## Requirements
- Moodle 4.5 or later.
- Grunt tooling available for building AMD modules (`mdk run grunt amd` or Moodle root `grunt amd`).

## Installation
1. Copy the `block_graphcalc` folder into your Moodle instance under `blocks/`.
2. Purge caches or bump the plugin version to register new language strings and templates.
3. Run `grunt amd` in the Moodle root (or `mdk run grunt amd`) to build the JavaScript module.

## Usage
1. While editing a course, choose *Add a block* → *Graphing calculator*.
2. Open the block configuration and ensure *Display on page types* is set to the appropriate scope:
   - For quizzes, choose **Any page** and enable block visibility in quiz *Appearance* settings.
3. Enter an expression (e.g. `x^2 + 3`) and adjust the domain/sample density as needed.

## Development notes
- Expressions are validated to accept digits, the `x` variable, parentheses, spaces, and arithmetic operators `+ - * / ^`.
- All evaluation happens client-side; the privacy provider declares that no personal data is stored.
- `db/mobile.php` includes a placeholder for future Moodle App handlers.
- Tests folders (`tests/behat`, `tests/phpunit`) are scaffolded for future coverage.

## Roadmap
- Add optional presets for common functions and domain ranges when `allowadvanced` is enabled.
- Provide Moodle App support via `db/mobile.php` handlers and Ionic-friendly templates.
- Expand validation to support trigonometric functions using a dedicated math parser.
