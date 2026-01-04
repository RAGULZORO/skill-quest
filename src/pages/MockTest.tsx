import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  ArrowRight,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';

interface MockTestConfig {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  total_questions: number;
  aptitude_questions: number | null;
  technical_questions: number | null;
  gd_questions: number | null;
  aptitude_levels: number[] | null;
  technical_levels: number[] | null;
  gd_levels: number[] | null;
  time_minutes: number;
}

interface Question {
  id: string;
  type: 'aptitude' | 'technical';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Answer {
  questionId: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
}

const MockTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [testConfig, setTestConfig] = useState<MockTestConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // Default 30 minutes
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (user && testId) {
      fetchTestConfig();
    }
  }, [user, testId]);

  // Timer
  useEffect(() => {
    if (testCompleted || loading || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testCompleted, loading, showResults]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchTestConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Mock test not found');
        navigate('/mock-tests');
        return;
      }

      setTestConfig(data);
      setTimeLeft(data.time_minutes * 60);
      await fetchQuestions(data);
    } catch (error) {
      console.error('Error fetching test config:', error);
      toast.error('Failed to load test configuration');
      navigate('/mock-tests');
    }
  };

  const fetchQuestions = async (config: MockTestConfig) => {
    try {
      const formattedQuestions: Question[] = [];

      // Fetch aptitude questions if configured
      if ((config.aptitude_questions || 0) > 0) {
        let aptitudeQuery = supabase
          .from('aptitude_questions')
          .select('*');

        // Filter by levels if specified
        if (config.aptitude_levels && config.aptitude_levels.length > 0) {
          aptitudeQuery = aptitudeQuery.in('level', config.aptitude_levels);
        }

        const { data: aptitudeData, error: aptitudeError } = await aptitudeQuery;

        if (aptitudeError) throw aptitudeError;

        // Shuffle and limit to configured count
        const shuffledAptitude = (aptitudeData || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, config.aptitude_questions || 0);

        shuffledAptitude.forEach((q: any) => {
          formattedQuestions.push({
            id: q.id,
            type: 'aptitude',
            question: q.question,
            options: Array.isArray(q.options) ? q.options : Object.values(q.options || {}),
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
          });
        });
      }

      // Fetch technical questions if configured
      if ((config.technical_questions || 0) > 0) {
        let technicalQuery = supabase
          .from('technical_questions')
          .select('*');

        // Filter by levels if specified
        if (config.technical_levels && config.technical_levels.length > 0) {
          technicalQuery = technicalQuery.in('level', config.technical_levels);
        }

        const { data: technicalData, error: technicalError } = await technicalQuery;

        if (technicalError) throw technicalError;

        // Shuffle and limit to configured count
        const shuffledTechnical = (technicalData || [])
          .sort(() => Math.random() - 0.5)
          .slice(0, config.technical_questions || 0);

        shuffledTechnical.forEach((q: any) => {
          // Create MCQ-style options from technical question
          const options = [
            q.solution?.substring(0, 100) + '...' || 'Option A',
            'Incorrect approach 1',
            'Incorrect approach 2', 
            'Incorrect approach 3',
          ];
          
          formattedQuestions.push({
            id: q.id,
            type: 'technical',
            question: q.title + ': ' + q.description,
            options: options,
            correctAnswer: 0, // First option is correct (the solution)
            explanation: q.approach,
          });
        });
      }

      // Shuffle all questions together
      const shuffled = formattedQuestions.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);

      // Initialize answers
      const initialAnswers: Record<string, Answer> = {};
      shuffled.forEach((q) => {
        initialAnswers[q.id] = {
          questionId: q.id,
          selectedAnswer: null,
          isCorrect: false,
        };
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedAnswer: answerIndex,
        isCorrect: answerIndex === question.correctAnswer,
      },
    }));
  };

  const handleSubmit = async () => {
    if (submitting || !testConfig) return;
    
    setSubmitting(true);
    try {
      // Save progress to database with mock_test_id prefix for tracking
      const progressEntries = Object.values(answers).map((answer) => ({
        user_id: user?.id,
        question_id: `${testId}_${answer.questionId}`,
        question_type: 'mock_test',
        is_correct: answer.isCorrect,
        time_spent_seconds: Math.floor((testConfig.time_minutes * 60 - timeLeft) / questions.length),
      }));

      const { error } = await supabase
        .from('user_progress')
        .insert(progressEntries);

      if (error) throw error;

      setTestCompleted(true);
      setShowResults(true);
      toast.success('Test submitted successfully!');
    } catch (error) {
      console.error('Error submitting test:', error);
      toast.error('Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const getScore = () => {
    return Object.values(answers).filter((a) => a.isCorrect).length;
  };

  const getPercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round((getScore() / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (showResults) {
    const score = getScore();
    const percentage = getPercentage();
    const passed = percentage >= 80;

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mock-tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">{testConfig?.name} - Results</span>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {passed ? (
                <Trophy className="w-12 h-12 text-green-500" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {passed 
                ? `You've passed ${testConfig?.name}! The next level is now unlocked.`
                : `You need 80% to pass. Try again to unlock the next level.`
              }
            </p>

            <div className="bg-card rounded-3xl p-8 shadow-card border border-border mb-8">
              <div className="text-5xl font-bold text-foreground mb-2">{percentage}%</div>
              <div className="text-muted-foreground mb-6">Your Score: {score}/{questions.length}</div>
              
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden mb-4">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-foreground">{score} Correct</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-foreground">{questions.length - score} Incorrect</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/mock-tests')}>
                Back to Mock Tests
              </Button>
              {!passed && (
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mock-tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">{testConfig?.name}</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Questions Available</h2>
          <p className="text-muted-foreground mb-6">
            This test doesn't have any questions configured yet.
          </p>
          <Button onClick={() => navigate('/mock-tests')}>Back to Mock Tests</Button>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
                  navigate('/mock-tests');
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">{testConfig?.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              timeLeft < 300 ? 'bg-red-500/20 text-red-500' : 'bg-muted text-foreground'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Question counter */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              currentQuestion?.type === 'aptitude' 
                ? 'bg-primary/10 text-primary' 
                : 'bg-secondary/10 text-secondary'
            }`}>
              {currentQuestion?.type === 'aptitude' ? 'Aptitude' : 'Technical'}
            </span>
          </div>

          {/* Question Card */}
          <div className="bg-card rounded-3xl p-6 md:p-8 shadow-card border border-border mb-6">
            <h2 className="text-lg md:text-xl font-medium text-foreground mb-6">
              {currentQuestion?.question}
            </h2>

            <RadioGroup
              value={answers[currentQuestion?.id]?.selectedAnswer?.toString() || ''}
              onValueChange={(value) => handleAnswerSelect(currentQuestion?.id, parseInt(value))}
            >
              <div className="space-y-3">
                {currentQuestion?.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      answers[currentQuestion?.id]?.selectedAnswer === idx
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleAnswerSelect(currentQuestion?.id, idx)}
                  >
                    <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-foreground">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2 flex-wrap justify-center max-w-md">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    idx === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : answers[questions[idx]?.id]?.selectedAnswer !== null
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
                <CheckCircle className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                Next
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MockTest;
