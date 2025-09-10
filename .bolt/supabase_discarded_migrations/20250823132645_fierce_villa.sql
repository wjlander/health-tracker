@@ .. @@
 -- Step 4: Add temporary policy to allow user creation during signup
 -- This policy allows the trigger function to insert user records
 DROP POLICY IF EXISTS "allow_signup_user_creation" ON users;
-CREATE POLICY IF NOT EXISTS "allow_signup_user_creation"
+CREATE POLICY "allow_signup_user_creation"
   ON users
   FOR INSERT
   TO public
   WITH CHECK (true);