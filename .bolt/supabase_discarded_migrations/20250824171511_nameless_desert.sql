@@ .. @@
 -- Create default users if they don't exist
-INSERT INTO users (id, name, role) VALUES 
-  ('jayne-id', 'Jayne', 'patient'),
-  ('william-id', 'William', 'patient')
-ON CONFLICT (id) DO NOTHING;
+INSERT INTO users (name, role) VALUES 
+  ('Jayne', 'patient'),
+  ('William', 'patient')
+ON CONFLICT (name) DO NOTHING;