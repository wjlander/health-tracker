@@ .. @@
DROP POLICY IF EXISTS "users_policy" ON users;
CREATE POLICY "users_policy"
  ON users
  FOR ALL
-  TO authenticated
+  TO public
  USING (true)
  WITH CHECK (true);