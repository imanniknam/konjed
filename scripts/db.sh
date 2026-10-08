#!/usr/bin/env bash
# Local PostgreSQL for development (isolated from any other Postgres on the machine).
# Usage: scripts/db.sh start|stop|status|reset
set -e
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$ROOT/.data/pg"
PORT="${KONJED_PG_PORT:-54329}"
BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
case "$1" in
  start)
    if [ ! -d "$PGDATA" ]; then
      "$BIN/initdb" -D "$PGDATA" -U konjed --auth=trust -E UTF8 --locale=en_US.UTF-8 >/dev/null
    fi
    "$BIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l "$ROOT/.data/pg.log" -w start || true
    "$BIN/createdb" -h 127.0.0.1 -p "$PORT" -U konjed konjed 2>/dev/null || true
    echo "postgres://konjed@127.0.0.1:$PORT/konjed"
    ;;
  stop) "$BIN/pg_ctl" -D "$PGDATA" -m fast stop ;;
  status) "$BIN/pg_ctl" -D "$PGDATA" status ;;
  reset) "$0" stop || true; rm -rf "$PGDATA"; "$0" start ;;
  *) echo "usage: $0 start|stop|status|reset"; exit 1 ;;
esac
