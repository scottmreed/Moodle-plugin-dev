# Graphing Calculator Block: Architecture Notes

## Component Identity
- **Plugin type**: block
- **Frankenstyle component**: `block_graphcalc`
- **Target Moodle version**: 4.5 (confirm before release)

## Surfaces
- **PHP**: `block_graphcalc` class renders a templatable `calculator` renderable via the plugin renderer.
- **JavaScript**: AMD module `block_graphcalc/calculator` drives a client-side calculator using the Fetch API-free stack (plain JS + Moodle core utilities). Expressions are sanitised before being evaluated in a sandboxed `Function` wrapper.
- **Mobile**: `db/mobile.php` reserved for future handlers mapped via `\block_graphcalc\output\mobile` classes.

## Capabilities
- `block/graphcalc:addinstance` (editing teachers and managers).
- `block/graphcalc:myaddinstance` (users can add to dashboard).
- `block/graphcalc:view` (default allow for students/teachers/managers/guests).

## Data & Privacy
- No server-side persistence; expressions evaluated client-side.
- Privacy provider is a `null_provider`, string key `privacy:metadata` documents no personal data is stored.

## Pending Tasks
- Introduce optional presets and advanced controls gated by the `allowadvanced` configuration flag.
- Implement Moodle App handlers and Ionic templates.
- Write Behat and PHPUnit scenarios covering block placement, expression validation, and quiz usage flows.
