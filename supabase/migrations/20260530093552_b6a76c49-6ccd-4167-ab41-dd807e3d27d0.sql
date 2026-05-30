-- Promote praeceptor.ai@gmail.com to admin (idempotent)
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'praeceptor.ai@gmail.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Tighten chat RLS: only the item reporter (for that item) or an admin
-- may read and write messages tied to an item. Messages with no item_id
-- (legacy / general thread) keep the existing user-owns-thread rule.
DROP POLICY IF EXISTS "Users read their thread or admins read all" ON public.messages;
CREATE POLICY "Reporter or admin reads item thread"
ON public.messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    auth.uid() = user_id
    AND (
      item_id IS NULL
      OR EXISTS (SELECT 1 FROM public.items i WHERE i.id = messages.item_id AND i.reporter_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Student sends own message" ON public.messages;
CREATE POLICY "Reporter sends own item message"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND user_id = auth.uid()
  AND from_admin = false
  AND (
    item_id IS NULL
    OR EXISTS (SELECT 1 FROM public.items i WHERE i.id = messages.item_id AND i.reporter_id = auth.uid())
  )
);

-- Ensure realtime delivers full row changes for instant chat updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;