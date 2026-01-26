-- Create mock_test_results table to store user test results
CREATE TABLE public.mock_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mock_test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mock_test_results ENABLE ROW LEVEL SECURITY;

-- Users can insert their own results
CREATE POLICY "Users can insert their own results"
ON public.mock_test_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own results
CREATE POLICY "Users can view their own results"
ON public.mock_test_results
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all results
CREATE POLICY "Admins can view all results"
ON public.mock_test_results
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_mock_test_results_user_id ON public.mock_test_results(user_id);
CREATE INDEX idx_mock_test_results_mock_test_id ON public.mock_test_results(mock_test_id);