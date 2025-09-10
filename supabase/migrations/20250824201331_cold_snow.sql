@@ .. @@
 $$ LANGUAGE plpgsql;

+-- Function to get top heartburn food triggers
+CREATE OR REPLACE FUNCTION get_top_heartburn_triggers(p_user_id uuid)
+RETURNS TABLE (
+  food_name text,
+  episode_count bigint,
+  avg_time_to_heartburn numeric,
+  avg_correlation numeric,
+  avg_severity numeric
+) AS $$
+BEGIN
+  RETURN QUERY
+  SELECT 
+    fe.name as food_name,
+    COUNT(*) as episode_count,
+    AVG(hfc.time_between_hours) as avg_time_to_heartburn,
+    AVG(hfc.correlation_strength) as avg_correlation,
+    AVG(he.severity) as avg_severity
+  FROM heartburn_food_correlations hfc
+  JOIN food_entries fe ON hfc.food_entry_id = fe.id
+  JOIN heartburn_entries he ON hfc.heartburn_entry_id = he.id
+  WHERE hfc.user_id = p_user_id
+  GROUP BY fe.name
+  HAVING COUNT(*) >= 2 -- Only show foods that triggered heartburn at least twice
+  ORDER BY AVG(hfc.correlation_strength) DESC, COUNT(*) DESC
+  LIMIT 10;
+END;
+$$ LANGUAGE plpgsql;
+
 -- Trigger to automatically detect correlations when heartburn is logged
@@ .. @@