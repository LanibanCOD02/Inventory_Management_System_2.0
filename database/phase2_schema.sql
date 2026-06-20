-- 1. Create the Storage Bucket for file uploads (Publicly accessible)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('msc-trust-files', 'msc-trust-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the Inventory Items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 10,
  product_photo_url TEXT,
  bill_image_url TEXT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create the Inventory Movements table (Inward/Outward)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE, -- e.g., 'IN-1042', 'OUT-0824'
  item_id UUID REFERENCES inventory_items(id) NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  party_name TEXT NOT NULL, -- The supplier or the program name
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure service_role has privileges on the new tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role, postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role, postgres;
