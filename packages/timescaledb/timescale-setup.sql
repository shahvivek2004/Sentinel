-- TimescaleDB setup

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;

CREATE TABLE IF NOT EXISTS raw_tick_status (
    site_id TEXT NOT NULL,
    region_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL,
    response_time_ms INT NOT NULL,
    status_code INT,
    error_type TEXT,
    error_reason TEXT
) WITH (
    timescaledb.hypertable,
    timescaledb.segmentby = 'site_id,region_id',
    timescaledb.orderby = 'created_at DESC',
    timescaledb.chunk_interval = '1 hour'
);

CREATE INDEX idx_main ON raw_tick_status (site_id, region_id, created_at DESC);

CREATE MATERIALIZED VIEW aggregate_30m
WITH (timescaledb.continuous) AS
SELECT
 site_id,
 region_id,
 time_bucket('30 minutes', created_at) AS bucket,
 COUNT(*) AS total_checks,
 COUNT(*) FILTER (WHERE status = 'Up') AS up_checks,  
 COUNT(*) FILTER (WHERE status = 'Down') AS down_checks,
 COUNT(*) FILTER (WHERE status = 'Warning') AS warn_checks,
 MIN(response_time_ms) AS min_rt,
 MAX(response_time_ms) AS max_rt,
 AVG(response_time_ms) AS avg_rt,
 percentile_agg(response_time_ms) AS response_time_percentiles
FROM raw_tick_status
GROUP BY 1, 2, 3;

CREATE MATERIALIZED VIEW aggregate_daily
WITH (timescaledb.continuous) AS
SELECT
    site_id,
    region_id,
    time_bucket('1 day', bucket)  AS bucket,
    SUM(total_checks)             AS total_checks,
    SUM(up_checks)                AS up_checks,
    SUM(down_checks)              AS down_checks,
    SUM(warn_checks)              AS warn_checks,
    MIN(min_rt)                   AS min_rt,
    MAX(max_rt)                   AS max_rt,
    AVG(avg_rt)                   AS avg_rt,
    rollup(response_time_percentiles) AS response_time_percentiles
FROM aggregate_30m
GROUP BY 1, 2, 3;
      
-- Refresh policies
SELECT add_continuous_aggregate_policy('aggregate_30m',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '31 minutes',
  schedule_interval => INTERVAL '30 minutes'
);

SELECT add_continuous_aggregate_policy('aggregate_daily',
  start_offset      => INTERVAL '3 days',
  end_offset        => INTERVAL '13 hours',
  schedule_interval => INTERVAL '12 hours'
);

-- Retention policies
SELECT add_retention_policy('raw_tick_status', INTERVAL '3 days');
SELECT add_retention_policy('aggregate_30m', INTERVAL '2 weeks');

-- Compression policies

-- Compression policy for aggregate_30m
ALTER MATERIALIZED VIEW aggregate_30m SET (timescaledb.columnstore = true);
SELECT add_compression_policy('aggregate_30m', INTERVAL '1 week');

-- Compression policy for raw_tick_status
-- Remove the auto-created policy and add one with your intended interval
SELECT remove_compression_policy('raw_tick_status');
SELECT add_compression_policy('raw_tick_status', INTERVAL '12 hours');