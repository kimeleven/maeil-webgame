-- t_287677ef additive migration for the maeil-webgame DB (OCI). Run once as the DB owner role.
-- Additive only: one new table + one index. Existing tables are not altered. App role keeps DML only.
-- Rollback: the code rollback alone is enough (stats.games reports 'events table not created yet' or
-- just stops growing). Removing the table deletes collected events and needs separate approval.
-- Replace <app_role> with the maeil-webgame app login role.
BEGIN;
CREATE TABLE IF NOT EXISTS game_events (
  event_id     TEXT PRIMARY KEY,
  g            TEXT NOT NULL,
  name         TEXT NOT NULL,
  lang         TEXT NOT NULL,
  src          TEXT NOT NULL,
  reason       TEXT,
  method       TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_events_received_at ON game_events (received_at);
GRANT SELECT, INSERT ON game_events TO <app_role>;
COMMIT;
