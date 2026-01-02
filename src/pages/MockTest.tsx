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
  const { level } = useParams<{ level: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [showResults, setShowResults] = useState(false);

  const levelNum = parseInt(level || '1');

  useEffect(() => {
    if (user && level) {
      fetchQuestions();
    }
  }, [user, level]);

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

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Fetch 15 aptitude questions for this level
      const { data: aptitudeData, error: aptitudeError } = await supabase
        .from('aptitude_questions')
        .select('*')
        .eq('level', levelNum)
        .limit(15);

      if (aptitudeError) throw aptitudeError;

      // Fetch 5 technical questions for this level
      const { data: technicalData, error: technicalError } = await supabase
        .from('technical_questions')
        .select('*')
        .eq('level', levelNum)
        .limit(5);

      if (technicalError) throw technicalError;

      const formattedQuestions: Question[] = [];

      // Format aptitude questions
      aptitudeData?.forEach((q: any, idx: number) => {
        formattedQuestions.push({
          id: `mock_level_${levelNum}_aptitude_${idx}`,
          type: 'aptitude',
          question: q.question,
          options: Array.isArray(q.options) ? q.options : Object.values(q.options || {}),
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
        });
      });

      // Format technical questions (convert to MCQ format)
      technicalData?.forEach((q: any, idx: number) => {
        // Create MCQ-style options from technical question
        const options = [
          q.solution?.substring(0, 100) + '...' || 'Option A',
          'Incorrect approach 1',
          'Incorrect approach 2', 
          'Incorrect approach 3',
        ];
        
        formattedQuestions.push({
          id: `mock_level_${levelNum}_technical_${idx}`,
          type: 'technical',
          question: q.title + ': ' + q.description,
          options: options,
          correctAnswer: 0, // First option is correct (the solution)
          explanation: q.approach,
        });
      });

      // Shuffle questions
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
    if (submitting) return;
    
    setSubmitting(true);
    try {
      // Save progress to database
      const progressEntries = Object.values(answers).map((answer) => ({
        user_id: user?.id,
        question_id: answer.questionId,
        question_type: 'mock_test',
        is_correct: answer.isCorrect,
        time_spent_seconds: Math.floor((30 * 60 - timeLeft) / questions.length),
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
            <span className="text-xl font-bold text-foreground">Level {levelNum} Results</span>
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
                ? `You've passed Level ${levelNum}! ${levelNum < 3 ? 'Level ' + (levelNum + 1) + ' is now unlocked.' : 'You\'ve completed all levels!'}`
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
                Back to Levels
              </Button>
              {!passed && (
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              )}
              {passed && levelNum < 3 && (
                <Button onClick={() => navigate(`/mock-test/${levelNum + 1}`)}>
                  Next Level
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
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
            <span className="text-xl font-bold text-foreground">Level {levelNum}</span>
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

            <div className="flex gap-2">
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
