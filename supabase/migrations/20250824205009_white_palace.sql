/*
  # Create get_top_heartburn_triggers function

  1. New Functions
    - `get_top_heartburn_triggers(p_user_id uuid)`
      - Returns top food triggers for heartburn episodes
      - Analyzes correlation between food consumption and heartburn timing
      - Returns food name, episode count, average time to heartburn, and correlation strength

  2. Logic
    - Finds heartburn episodes within 6 hours of food consumption
    - Calculates correlation strength based on frequency and severity
    - Returns top 10 triggers with at least 2 associated episodes
*/

CREATE OR REPLACE FUNCTION public.get_top_heartburn_triggers(p_user_id uuid)
RETURNS TABLE(
    food_name text,
    episode_count bigint,
    avg_time_to_heartburn numeric,
    avg_correlation numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH heartburn_episodes AS (
        SELECT
            he.id AS heartburn_id,
            he.date AS heartburn_date,
            he.time AS heartburn_time,
            he.severity AS heartburn_severity,
            (he.date || ' ' || he.time)::timestamp AS heartburn_timestamp
        FROM
            public.heartburn_entries he
        WHERE
            he.user_id = p_user_id
    ),
    food_consumed AS (
        SELECT
            fe.id AS food_id,
            fe.name AS food_name,
            fe.user_id,
            CASE 
                WHEN fe.health_entry_id IS NOT NULL THEN
                    (he_link.date || ' ' || fe.time)::timestamp
                ELSE
                    (fe.created_at::date || ' ' || fe.time)::timestamp
            END AS food_timestamp
        FROM
            public.food_entries fe
        LEFT JOIN
            public.health_entries he_link ON fe.health_entry_id = he_link.id
        WHERE
            fe.user_id = p_user_id
    ),
    correlated_events AS (
        SELECT
            fc.food_name,
            EXTRACT(EPOCH FROM (he.heartburn_timestamp - fc.food_timestamp)) / 3600.0 AS time_diff_hours,
            he.heartburn_severity
        FROM
            heartburn_episodes he
        JOIN
            food_consumed fc ON fc.user_id = p_user_id
        WHERE
            he.heartburn_timestamp > fc.food_timestamp
            AND (he.heartburn_timestamp - fc.food_timestamp) <= INTERVAL '6 hours'
    )
    SELECT
        ce.food_name::text,
        COUNT(ce.food_name)::bigint AS episode_count,
        AVG(ce.time_diff_hours)::numeric AS avg_time_to_heartburn,
        (COUNT(ce.food_name) * AVG(ce.heartburn_severity) / 10.0)::numeric AS avg_correlation
    FROM
        correlated_events ce
    GROUP BY
        ce.food_name
    HAVING
        COUNT(ce.food_name) >= 2
    ORDER BY
        avg_correlation DESC, episode_count DESC
    LIMIT 10;
END;
$$;