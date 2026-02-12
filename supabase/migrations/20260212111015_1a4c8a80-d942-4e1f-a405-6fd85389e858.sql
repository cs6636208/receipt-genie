
-- Create receipts table
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT,
  receipt_date DATE,
  total_amount NUMERIC(12,2),
  category TEXT,
  image_url TEXT,
  raw_ai_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense items table
CREATE TABLE public.expense_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2),
  total_price NUMERIC(12,2),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public access since no auth)
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required)
CREATE POLICY "Public read receipts" ON public.receipts FOR SELECT USING (true);
CREATE POLICY "Public insert receipts" ON public.receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update receipts" ON public.receipts FOR UPDATE USING (true);
CREATE POLICY "Public delete receipts" ON public.receipts FOR DELETE USING (true);

CREATE POLICY "Public read expense_items" ON public.expense_items FOR SELECT USING (true);
CREATE POLICY "Public insert expense_items" ON public.expense_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update expense_items" ON public.expense_items FOR UPDATE USING (true);
CREATE POLICY "Public delete expense_items" ON public.expense_items FOR DELETE USING (true);

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies
CREATE POLICY "Public read receipt images" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public upload receipt images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
