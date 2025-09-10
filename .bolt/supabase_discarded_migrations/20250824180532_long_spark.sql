@@ .. @@
 -- Ensure the default users exist in the database
 INSERT INTO users (name, role) VALUES 
   ('Jayne', 'patient'),
-  ('William', 'patient'),
-  ('William', 'patient')
-ON CONFLICT (name) DO UPDATE SET
-  tracking_preferences = EXCLUDED.tracking_preferences,
-  updated_at = now();
+  ('William', 'patient')
+ON CONFLICT (name) DO UPDATE SET
+  updated_at = now();