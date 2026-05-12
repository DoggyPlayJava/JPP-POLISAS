-- Migration 61: Upgrade get_database_health_metrics with WAL & Realtime monitoring
-- Fix: SET search_path to include 'extensions' schema (pg_stat_statements lives there)
-- This also fixes the original PostgreSQL Cluster card which was showing all zeros.

CREATE OR REPLACE FUNCTION public.get_database_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    result jsonb;
    v_max_connections int;
    v_active_connections int;
    v_idle_connections int;
    v_txid_age bigint;
    v_db_size_mb numeric;
    v_cache_hit_rate numeric;
    v_dead_tuples_pct numeric;
    v_waiting_locks int;
    v_long_running_queries int;
    v_wal_retained_bytes bigint;
    v_wal_retained_mb numeric;
    v_replication_slot_name text;
    v_replication_slot_active boolean;
    v_realtime_tables int;
    v_realtime_list_changes_calls bigint;
    v_realtime_list_changes_total_ms numeric;
    v_db_uptime_seconds numeric;
BEGIN
    SELECT setting::int INTO v_max_connections FROM pg_settings WHERE name = 'max_connections';
    SELECT count(*) INTO v_active_connections FROM pg_stat_activity WHERE state = 'active' AND backend_type = 'client backend';
    SELECT count(*) INTO v_idle_connections FROM pg_stat_activity WHERE state LIKE 'idle%' AND backend_type = 'client backend';
    SELECT max(age(datfrozenxid)) INTO v_txid_age FROM pg_database;
    SELECT round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) INTO v_db_size_mb;
    SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) INTO v_cache_hit_rate FROM pg_stat_database;
    SELECT round(100.0 * sum(n_dead_tup) / nullif(sum(n_live_tup) + sum(n_dead_tup), 0), 2) INTO v_dead_tuples_pct FROM pg_stat_user_tables;
    SELECT count(*) INTO v_waiting_locks FROM pg_stat_activity WHERE wait_event_type = 'Lock';
    SELECT count(*) INTO v_long_running_queries FROM pg_stat_activity WHERE state = 'active' AND (now() - query_start) > interval '5 minutes';

    -- WAL Retained by Replication Slots
    SELECT slot_name, active, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)
    INTO v_replication_slot_name, v_replication_slot_active, v_wal_retained_bytes
    FROM pg_replication_slots ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC LIMIT 1;
    v_wal_retained_mb := COALESCE(round(v_wal_retained_bytes / 1024.0 / 1024.0, 2), 0);

    -- Realtime-enabled table count
    SELECT count(*) INTO v_realtime_tables FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

    -- list_changes call stats (graceful fallback if pg_stat_statements unavailable)
    BEGIN
        SELECT calls, round(total_exec_time::numeric, 2)
        INTO v_realtime_list_changes_calls, v_realtime_list_changes_total_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%realtime.list_changes%'
        ORDER BY total_exec_time DESC LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_realtime_list_changes_calls := 0;
        v_realtime_list_changes_total_ms := 0;
    END;

    -- Database uptime
    SELECT extract(epoch FROM (now() - pg_postmaster_start_time())) INTO v_db_uptime_seconds;

    result := jsonb_build_object(
        'max_connections', v_max_connections,
        'active_connections', v_active_connections,
        'idle_connections', v_idle_connections,
        'txid_age', v_txid_age,
        'db_size_mb', v_db_size_mb,
        'cache_hit_rate_pct', COALESCE(v_cache_hit_rate, 100),
        'dead_tuples_pct', COALESCE(v_dead_tuples_pct, 0),
        'waiting_locks', v_waiting_locks,
        'long_running_queries', v_long_running_queries,
        'wal_retained_mb', v_wal_retained_mb,
        'replication_slot_name', COALESCE(v_replication_slot_name, 'none'),
        'replication_slot_active', COALESCE(v_replication_slot_active, false),
        'realtime_tables', COALESCE(v_realtime_tables, 0),
        'realtime_list_changes_calls', COALESCE(v_realtime_list_changes_calls, 0),
        'realtime_list_changes_total_ms', COALESCE(v_realtime_list_changes_total_ms, 0),
        'db_uptime_seconds', round(v_db_uptime_seconds)
    );
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_database_health_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_database_health_metrics() TO authenticated;
