@@ .. @@
 DECLARE
     table_count INTEGER;
-    table_name TEXT;
+    tbl_name TEXT;
     user_count INTEGER;
     tables TEXT[] := ARRAY[
         'users', 'health_entries', 'food_entries', 'activity_entries',
@@ .. @@
     RAISE NOTICE '=== DATABASE TABLE VERIFICATION ===';
     
-    FOREACH table_name IN ARRAY tables
+    FOREACH tbl_name IN ARRAY tables
     LOOP
         SELECT COUNT(*) INTO table_count 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
-        AND table_name = table_name;
+        AND table_name = tbl_name;
         
         IF table_count > 0 THEN
-            RAISE NOTICE '✅ Table exists: %', table_name;
+            RAISE NOTICE '✅ Table exists: %', tbl_name;
         ELSE
-            RAISE NOTICE '❌ Table missing: %', table_name;
+            RAISE NOTICE '❌ Table missing: %', tbl_name;
         END IF;
     END LOOP;