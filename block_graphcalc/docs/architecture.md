# Graphing Calculator Block: Architecture Notes

## Component Identity
- **Plugin type**: block
- **Frankenstyle component**: `block_graphcalc`
- **Target Moodle version**: 4.5 (confirm before release)

## Surfaces
- **PHP**: `block_graphcalc` class delegates rendering to a dedicated renderer/ Mustache template.
- **JavaScript**: AMD module `block_graphcalc/calculator` will host reactive calculator logic leveraging `core/reactive`.
- **Mobile**: `db/mobile.php` reserved for future handlers mapped via `\block_graphcalc\output\mobile` classes.

## Capabilities
- `block/graphcalc:addinstance` (editing teachers and managers).
- `block/graphcalc:myaddinstance` (users can add to dashboard).
- `block/graphcalc:view` (default allow for students/teachers/managers/guests).

## Data & Privacy
- No server-side persistence; expressions evaluated client-side.
- Privacy provider is a `null_provider`, string key `privacy:metadata` documents no personal data is stored.

## Pending Tasks
- Implement renderer and Mustache template for calculator UI.
- Build AMD module providing expression evaluation and plotting.
- Add settings UI toggles to expose advanced features per instance/global scope.
- Write Behat and PHPUnit scaffolds covering block placement and configuration defaults.
