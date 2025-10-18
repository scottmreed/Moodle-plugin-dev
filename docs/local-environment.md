# Local Moodle 5 Development Environment

This project targets **Moodle 5.0.3+ (Build: 20251017)** for plugin development.
The following notes capture the full local setup we validated, including Docker,
PHP, Node, and MDK configuration.

## Core Versions & Tooling
- **Moodle**: 5.0.3+
- **PHP**: 8.3 (Homebrew `php@8.3`) with the `intl` extension enabled
- **Node.js**: 22.16.0 (required for `grunt amd` in Moodle 5.x)
- **Database**: PostgreSQL 16 running in a Docker container named `pgsql`
- **MDK**: moodle-sdk (installed via `pipx`) for scaffolding and automation

## One-Time Prerequisites
1. Install MDK and ensure it is initialised (`mdk init`).
2. Install PHP 8.3 via Homebrew and point MDK at it:
   ```bash
   brew install php@8.3
   mdk config set php /opt/homebrew/opt/php@8.3/bin/php
   ```
3. Update `/opt/homebrew/etc/php/8.3/php.ini` with:
   ```ini
   max_input_vars = 5000
   ```
   Homebrew’s build already enables the `intl` extension.
4. Install Node 22 (for example, via `nvm install 22.16.0`).
5. Ensure Docker Desktop is running.

## Database Container
Start (or restart) the Postgres container that MDK expects:
```bash
docker rm -f pgsql || true
docker run --name pgsql -d \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=root \
  -p 5432:5432 \
  postgres:16
```

## Create & Install Moodle 5
```bash
rm -rf ~/moodles/mymoodle
mdk create -n mymoodle -v 500
mdk install mymoodle -e pgsql-docker
```
If the installation needs to be rerun, drop the database first:
```bash
docker exec pgsql psql -U postgres -c "DROP DATABASE IF EXISTS mymoodle"
```

### Post-install configuration
Switch the site to the local dev server host and cookie path:
```bash
cd ~/moodles/mymoodle/moodle
/opt/homebrew/opt/php@8.3/bin/php admin/cli/cfg.php \
  --component=core --name=wwwroot --set=http://127.0.0.1:8100
/opt/homebrew/opt/php@8.3/bin/php admin/cli/cfg.php \
  --component=core --name=sessioncookiepath --set=/
```
Purge caches after configuration changes:
```bash
/opt/homebrew/opt/php@8.3/bin/php admin/cli/purge_caches.php
```

## Serving Moodle Locally
```bash
/opt/homebrew/opt/php@8.3/bin/php -S 127.0.0.1:8100 -t ~/moodles/mymoodle/moodle
```
Access the site at <http://127.0.0.1:8100/> (admin credentials: `admin` / `test`).

## Working with `block_graphcalc`
1. Copy (or symlink) the plugin into the Moodle checkout:
   ```bash
   cp -R /Users/scottreed/PycharmProjects/Moodle-plugin-dev/block_graphcalc \
         ~/moodles/mymoodle/moodle/blocks/graphcalc
   ```
2. Install dependencies and rebuild AMD modules (ensure Node 22 is on `PATH`):
   ```bash
   cd ~/moodles/mymoodle/moodle
   npm install
   PATH="/Users/scottreed/.nvm/versions/node/v22.16.0/bin:$PATH" npx grunt amd
   ```
3. Run the Moodle CLI upgrade after syncing code:
   ```bash
   /opt/homebrew/opt/php@8.3/bin/php admin/cli/upgrade.php
   /opt/homebrew/opt/php@8.3/bin/php admin/cli/purge_caches.php
   ```

## Useful Maintenance Commands
- Drop & recreate the Moodle database (before reinstall):
  ```bash
  docker exec pgsql psql -U postgres -c "DROP DATABASE IF EXISTS mymoodle"
  ```
- Inspect instance metadata:
  ```bash
  mdk info mymoodle
  ```
- Verify the Postgres container is running:
  ```bash
  docker ps --filter name=pgsql
  ```

Keep this document up to date whenever the local stack (PHP version, database,
Node requirements, etc.) changes.
