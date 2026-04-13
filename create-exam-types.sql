-- Create exam_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  default_rate_inr DECIMAL(10, 2) NOT NULL,
  default_rate_usd DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Enable RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exam_types
DROP POLICY IF EXISTS "Users can view own exam types" ON public.exam_types;
CREATE POLICY "Users can view own exam types" 
  ON public.exam_types FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own exam types" ON public.exam_types;
CREATE POLICY "Users can create own exam types"
  ON public.exam_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own exam types" ON public.exam_types;
CREATE POLICY "Users can update own exam types"
  ON public.exam_types FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_types_user_id ON public.exam_types(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_status ON public.exam_types(status);
