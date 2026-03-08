import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import CodeEditor from '@/components/CodeEditor';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Code,
  Copy,
  Lightbulb,
  Loader2,
  Play,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ValidationResult {
  isValid: boolean;
  feedback: string;
  score: number;
}

interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  examples: { input: string; output: string }[];
  approach: string;
  solution: string;
  category: string;
  level: number;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'typescript', label: 'TypeScript' },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'text-success bg-success/10';
    case 'medium': return 'text-warning bg-warning/10';
    case 'hard': return 'text-destructive bg-destructive/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

const CodingQuestionPage = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState<CodingQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCode, setUserCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [showApproach, setShowApproach] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    if (questionId) {
      fetchQuestion();
      if (user) {
        fetchSavedCode();
        checkIfSolved();
      }
    }
  }, [questionId, user]);

  const fetchQuestion = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_questions')
      .select('*')
      .eq('id', questionId!)
      .maybeSingle();

    if (!error && data) {
      setQuestion({
        id: data.id,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        examples: (data.examples as { input: string; output: string }[]) || [],
        approach: data.approach,
        solution: data.solution,
        category: data.category,
        level: data.level || 1,
      });
    }
    setLoading(false);
  };

  const fetchSavedCode = async () => {
    if (!user || !questionId) return;
    const { data } = await supabase
      .from('user_code_solutions')
      .select('code, language, validation_result, is_validated')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle();

    if (data) {
      setUserCode(data.code);
      setLanguage(data.language);
      if (data.is_validated && data.validation_result) {
        setValidationResult(data.validation_result as unknown as ValidationResult);
      }
    }
  };

  const checkIfSolved = async () => {
    if (!user || !questionId) return;
    const { data } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .eq('question_type', 'coding')
      .maybeSingle();
    setIsSolved(!!data);
  };

  const validateCode = async () => {
    if (!user || !userCode || !question) {
      toast({ title: 'Error', description: 'Please write some code first', variant: 'destructive' });
      return;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-code', {
        body: {
          code: userCode,
          language,
          question: `${question.title}\n\n${question.description}`,
          examples: question.examples,
        },
      });

      if (error) throw error;

      const result: ValidationResult = { isValid: data.isValid, feedback: data.feedback, score: data.score };
      setValidationResult(result);
      await saveCode(result);

      if (result.isValid && !isSolved) {
        await supabase.from('user_progress').insert([{
          user_id: user.id,
          question_id: question.id,
          question_type: 'coding',
          is_correct: true,
          time_spent_seconds: 0,
        }]);
        setIsSolved(true);
      }

      toast({
        title: result.isValid ? 'Solution Accepted!' : 'Try Again',
        description: result.feedback.slice(0, 100),
        variant: result.isValid ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error validating code:', error);
      toast({ title: 'Error', description: 'Failed to validate code.', variant: 'destructive' });
    }
    setValidating(false);
  };

  const saveCode = async (result?: ValidationResult) => {
    if (!user || !questionId) return;
    await supabase.from('user_code_solutions').upsert([{
      user_id: user.id,
      question_id: questionId,
      code: userCode,
      language,
      is_validated: result?.isValid || false,
      validation_result: result ? { isValid: result.isValid, feedback: result.feedback, score: result.score } : null,
    }], { onConflict: 'user_id,question_id' });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Question not found.</p>
        <button onClick={() => navigate('/coding')} className="text-primary hover:underline text-sm">
          ← Back to Coding
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(question.difficulty)}`}>
                {question.difficulty}
              </span>
              <span className="text-xs text-muted-foreground">{question.category}</span>
              {isSolved && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{question.title}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Description */}
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{question.description}</p>
          </div>

          {/* Examples */}
          {question.examples.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground text-sm">Examples</h4>
              {question.examples.map((ex, i) => (
                <div key={i} className="bg-muted rounded-lg p-3 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Input:</span>{' '}
                    <code className="text-primary">{ex.input}</code>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Output:</span>{' '}
                    <code className="text-primary">{ex.output}</code>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Language:</span>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Code Editor */}
          <CodeEditor
            value={userCode}
            onChange={setUserCode}
            language={language}
            height="350px"
          />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={validateCode} disabled={validating} className="gap-2">
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run & Validate
            </Button>
            <Button variant="outline" onClick={() => saveCode()}>
              Save Code
            </Button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-4 rounded-lg ${
              validationResult.isValid
                ? 'bg-success/10 border border-success/30'
                : 'bg-destructive/10 border border-destructive/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-destructive" />
                )}
                <span className={`font-medium ${validationResult.isValid ? 'text-success' : 'text-destructive'}`}>
                  {validationResult.isValid ? 'Solution Accepted!' : 'Needs Improvement'}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">Score: {validationResult.score}/100</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{validationResult.feedback}</p>
            </div>
          )}

          {/* Approach */}
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApproach(!showApproach)}
              className="text-muted-foreground"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              {showApproach ? 'Hide' : 'Show'} Approach
            </Button>
            {showApproach && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{question.approach}</p>
              </div>
            )}
          </div>

          {/* Solution */}
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSolution(!showSolution)}
              className="text-muted-foreground"
            >
              <Code className="w-4 h-4 mr-2" />
              {showSolution ? 'Hide' : 'Show'} Solution
            </Button>
            {showSolution && (
              <div className="mt-2 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleCopy(question.solution)}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
                <CodeEditor value={question.solution} onChange={() => {}} language="javascript" height="200px" readOnly />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CodingQuestionPage;
