@@ .. @@
 -- Step 6: Create simple, bulletproof RLS policies
 
 -- Users table
-CREATE POLICY "users_policy"
+-- Policy for SELECT, UPDATE, DELETE
+CREATE POLICY "users_select_update_delete_policy"
   ON users
-  FOR ALL
+  FOR SELECT, UPDATE, DELETE
   TO authenticated
-  USING (id = auth.uid())
-  WITH CHECK (id = auth.uid());
+  USING (id = auth.uid());
+
+-- Policy for INSERT (allows the trigger to insert the new user's record)
+CREATE POLICY "users_insert_policy"
+  ON users
+  FOR INSERT
+  TO authenticated
+  WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
 
 -- Health entries