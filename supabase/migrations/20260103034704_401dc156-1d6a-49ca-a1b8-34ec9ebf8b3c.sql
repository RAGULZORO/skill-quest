-- Create mock_tests table for storing mock test configurations
CREATE TABLE IF NOT EXISTS public.mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  description TEXT,
  total_questions INTEGER NOT NULL,
  time_minutes INTEGER NOT NULL,
  aptitude_questions INTEGER DEFAULT 0,
  technical_questions INTEGER DEFAULT 0,
  gd_questions INTEGER DEFAULT 0,
  aptitude_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  technical_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  gd_levels INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active mock tests
CREATE POLICY "Anyone can read active mock tests"
  ON public.mock_tests FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can insert mock tests
CREATE POLICY "Admins can insert mock tests"
  ON public.mock_tests FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update mock tests
CREATE POLICY "Admins can update mock tests"
  ON public.mock_tests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can delete mock tests
CREATE POLICY "Admins can delete mock tests"
  ON public.mock_tests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mock_tests_difficulty ON public.mock_tests(difficulty);
CREATE INDEX IF NOT EXISTS idx_mock_tests_is_active ON public.mock_tests(is_active);