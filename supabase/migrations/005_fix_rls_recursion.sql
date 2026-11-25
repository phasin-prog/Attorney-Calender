-- Fix infinite recursion in RLS policies on users and public_holidays
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

DROP POLICY IF EXISTS "Admins manage users" ON users;
DROP POLICY IF EXISTS "Active users read users" ON users;

CREATE POLICY "Active users read users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins or self insert users" ON users
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR id = auth.uid());

CREATE POLICY "Admins or self update users" ON users
  FOR UPDATE TO authenticated USING (is_admin() OR id = auth.uid());

CREATE POLICY "Admins delete users" ON users
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins write holidays" ON public_holidays;

CREATE POLICY "Admins insert holidays" ON public_holidays
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins update holidays" ON public_holidays
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "Admins delete holidays" ON public_holidays
  FOR DELETE TO authenticated USING (is_admin());
