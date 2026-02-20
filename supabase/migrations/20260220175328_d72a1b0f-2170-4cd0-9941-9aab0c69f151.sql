
-- Add user_id to receipts table
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to expense_items table
ALTER TABLE public.expense_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop all permissive policies on receipts
DROP POLICY IF EXISTS "Public delete receipts" ON public.receipts;
DROP POLICY IF EXISTS "Public insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Public read receipts" ON public.receipts;
DROP POLICY IF EXISTS "Public update receipts" ON public.receipts;

-- Drop all permissive policies on expense_items
DROP POLICY IF EXISTS "Public delete expense_items" ON public.expense_items;
DROP POLICY IF EXISTS "Public insert expense_items" ON public.expense_items;
DROP POLICY IF EXISTS "Public read expense_items" ON public.expense_items;
DROP POLICY IF EXISTS "Public update expense_items" ON public.expense_items;

-- Create proper RLS policies for receipts (owner-scoped)
CREATE POLICY "Users can read own receipts"
  ON public.receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON public.receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON public.receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Create proper RLS policies for expense_items (owner-scoped)
CREATE POLICY "Users can read own expense_items"
  ON public.expense_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense_items"
  ON public.expense_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense_items"
  ON public.expense_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense_items"
  ON public.expense_items FOR DELETE
  USING (auth.uid() = user_id);
