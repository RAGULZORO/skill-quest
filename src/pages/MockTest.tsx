import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Brain, Code, MessageSquare, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Flag, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTestTimer } from '@/hooks/useTestTimer';
import { shuffleArray } from '@/lib/shuffle';

interface MockTestConfig {
  id: string;
  title: string;
  duration: number;
  questions: {
    aptitude: number;
    technical: number;
    gd: number;
  };
  difficulty: string;
}

interface Question {
  id: string;
  type: 'aptitude' | 'technical' | 'gd';
  question: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  title?: string;
  description?: string;
  pointsFor?: string[];
  pointsAgainst?: string[];
}

interface Answer {
  questionId: string;
  selectedOption?: number;
  answered: boolean;
  flagged: boolean;
}

const MockTest: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const config = location.state?.config as MockTestConfig | undefined;
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number; percentage: number } | null>(null);

  const handleTimeUp = useCallback(() => {
    setShowTimeUpDialog(true);
  }, []);

  const { 
    formattedTime, 
    isRunning, 
    isTimeUp, 
    start, 
    percentageRemaining 
  } = useTestTimer({
    initialTimeInSeconds: (config?.duration || 30) * 60,
    onTimeUp: handleTimeUp,
    autoStart: false,
  });

  useEffect(() => {
    if (!config) {
      toast({ title: 'Error', description: 'No test configuration found', variant: 'destructive' });
      navigate('/mock-tests');
      return;
    }
    fetchQuestions();
  }, [config]);

  const fetchQuestions = async () => {
    if (!config) return;
    setLoading(true);

    try {
      const allQuestions: Question[] = [];

      // Fetch aptitude questions
      if (config.questions.aptitude > 0) {
        const { data: aptitudeData } = await supabase
          .from('aptitude_questions')
          .select('id, question, options, correct_answer, explanation')
          .limit(100);

        if (aptitudeData) {
          const shuffled = shuffleArray(aptitudeData).slice(0, config.questions.aptitude);
          shuffled.forEach((q: any) => {
            allQuestions.push({
              id: q.id,
              type: 'aptitude',
              question: q.question,
              options: q.options,
              correctAnswer: q.correct_answer,
              explanation: q.explanation,
            });
          });
        }
      }

      // Fetch technical questions
      if (config.questions.technical > 0) {
        const { data: technicalData } = await supabase
          .from('technical_questions')
          .select('id, title, description')
          .limit(100);

        if (technicalData) {
          const shuffled = shuffleArray(technicalData).slice(0, config.questions.technical);
          shuffled.forEach((q: any) => {
            // Create simple MCQ from technical question
            allQuestions.push({
              id: q.id,
              type: 'technical',
              question: q.description,
              title: q.title,
              options: ['Approach A - Brute Force', 'Approach B - Optimized', 'Approach C - Dynamic Programming', 'Approach D - Greedy'],
              correctAnswer: 1, // For now, assume optimized is correct
              explanation: 'The optimized approach provides the best time complexity.',
            });
          });
        }
      }

      // Fetch GD topics
      if (config.questions.gd > 0) {
        const { data: gdData } = await supabase
          .from('gd_topics')
          .select('id, title, description, points_for, points_against')
          .limit(100);

        if (gdData) {
          const shuffled = shuffleArray(gdData).slice(0, config.questions.gd);
          shuffled.forEach((q: any) => {
            // Create opinion-based MCQ from GD topic
            allQuestions.push({
              id: q.id,
              type: 'gd',
              question: `In a group discussion about "${q.title}", which stance would you take?`,
              title: q.title,
              description: q.description,
              options: [
                'Strongly support',
                'Partially support with conditions',
                'Neutral / depends on context',
                'Oppose with reasoning',
              ],
              correctAnswer: 1, // Balanced view is often best
              explanation: 'A balanced perspective with conditions shows critical thinking.',
              pointsFor: q.points_for,
              pointsAgainst: q.points_against,
            });
          });
        }
      }

      // Shuffle all questions together
      const shuffledQuestions = shuffleArray(allQuestions);
      setQuestions(shuffledQuestions);

      // Initialize answers
      setAnswers(shuffledQuestions.map(q => ({
        questionId: q.id,
        answered: false,
        flagged: false,
      })));

    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({ title: 'Error', description: 'Failed to load questions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    setTestStarted(true);
    start();
  };

  const handleSelectOption = (optionIndex: number) => {
    setAnswers(prev => prev.map((a, i) => 
      i === currentIndex 
        ? { ...a, selectedOption: optionIndex, answered: true }
        : a
    ));
  };

  const handleFlagQuestion = () => {
    setAnswers(prev => prev.map((a, i) => 
      i === currentIndex 
        ? { ...a, flagged: !a.flagged }
        : a
    ));
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const calculateResults = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i]?.selectedOption === q.correctAnswer) {
        correct++;
      }
    });
    
    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    return { correct, total, percentage };
  };

  const handleSubmitTest = async () => {
    const calculatedResults = calculateResults();
    setResults(calculatedResults);
    setTestCompleted(true);
    setShowResults(true);
    setShowTimeUpDialog(false);

    // Save progress to database
    if (user) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const a = answers[i];
        
        await supabase.from('user_progress').insert({
          user_id: user.id,
          question_id: q.id,
          question_type: q.type,
          is_correct: a.selectedOption === q.correctAnswer,
          time_spent_seconds: Math.floor(((config?.duration || 30) * 60) / questions.length),
        });
      }
    }
  };

  const handleExitTest = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate('/mock-tests');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'aptitude': return <Brain className="w-4 h-4" />;
      case 'technical': return <Code className="w-4 h-4" />;
      case 'gd': return <MessageSquare className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'aptitude': return 'bg-primary/10 text-primary';
      case 'technical': return 'bg-accent/10 text-accent';
      case 'gd': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/mock-tests')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">{config?.title}</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Begin?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{config?.duration}</p>
                  <p className="text-sm text-muted-foreground">Minutes</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-foreground">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <Flag className="w-8 h-8 mx-auto mb-2 text-warning" />
                  <p className="text-2xl font-bold text-foreground">{config?.difficulty}</p>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Once you start, the timer cannot be paused. Make sure you're ready!
                </AlertDescription>
              </Alert>

              <Button size="lg" className="w-full text-lg py-6" onClick={handleStartTest}>
                Start Test
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-bold text-foreground text-center">Test Results</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="text-center mb-8">
            <CardContent className="pt-8 pb-8">
              <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                results.percentage >= 70 ? 'bg-success/20' : results.percentage >= 50 ? 'bg-warning/20' : 'bg-destructive/20'
              }`}>
                {results.percentage >= 70 ? (
                  <CheckCircle2 className={`w-12 h-12 text-success`} />
                ) : results.percentage >= 50 ? (
                  <AlertTriangle className={`w-12 h-12 text-warning`} />
                ) : (
                  <XCircle className={`w-12 h-12 text-destructive`} />
                )}
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-2">
                {results.percentage >= 70 ? 'Great Job!' : results.percentage >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
              </h2>

              <div className="text-6xl font-bold text-primary my-6">{results.percentage}%</div>

              <p className="text-lg text-muted-foreground">
                You answered <span className="font-semibold text-foreground">{results.correct}</span> out of <span className="font-semibold text-foreground">{results.total}</span> questions correctly
              </p>
            </CardContent>
          </Card>

          {/* Question Review */}
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, i) => {
                const isCorrect = answers[i]?.selectedOption === q.correctAnswer;
                const wasAnswered = answers[i]?.answered;

                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(q.type)}`}>
                            {q.type.charAt(0).toUpperCase() + q.type.slice(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">Q{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{q.title || q.question}</p>
                        {!wasAnswered && (
                          <p className="text-xs text-warning">Not answered</p>
                        )}
                        {wasAnswered && !isCorrect && q.options && (
                          <p className="text-xs text-muted-foreground">
                            Your answer: {q.options[answers[i].selectedOption!]} | 
                            Correct: {q.options[q.correctAnswer!]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-8">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/mock-tests')}>
              Back to Mock Tests
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry Test
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const answeredCount = answers.filter(a => a.answered).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Timer */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleExitTest}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg ${
                percentageRemaining < 20 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'
              }`}>
                <Clock className="w-5 h-5" />
                {formattedTime}
              </div>
            </div>

            <Button onClick={handleSubmitTest} size="sm">
              Submit Test
            </Button>
          </div>
          <Progress value={(answeredCount / questions.length) * 100} className="mt-3 h-1" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Navigator (Desktop) */}
          <div className="hidden lg:block">
            <Card className="sticky top-24">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => handleJumpToQuestion(i)}
                      className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                        i === currentIndex
                          ? 'bg-primary text-primary-foreground'
                          : answers[i]?.flagged
                          ? 'bg-warning/20 text-warning border border-warning'
                          : answers[i]?.answered
                          ? 'bg-success/20 text-success border border-success/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p><span className="inline-block w-3 h-3 bg-success/20 rounded mr-2"></span>Answered</p>
                  <p><span className="inline-block w-3 h-3 bg-warning/20 rounded mr-2"></span>Flagged</p>
                  <p><span className="inline-block w-3 h-3 bg-muted rounded mr-2"></span>Not answered</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${getTypeColor(currentQuestion.type)}`}>
                      {getTypeIcon(currentQuestion.type)}
                      {currentQuestion.type.charAt(0).toUpperCase() + currentQuestion.type.slice(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFlagQuestion}
                    className={currentAnswer?.flagged ? 'text-warning' : ''}
                  >
                    <Flag className={`w-4 h-4 ${currentAnswer?.flagged ? 'fill-warning' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Title */}
                {currentQuestion.title && (
                  <h2 className="text-xl font-semibold text-foreground">{currentQuestion.title}</h2>
                )}

                {/* Question Text */}
                <p className="text-foreground text-lg leading-relaxed">{currentQuestion.question}</p>

                {/* Additional Description for GD */}
                {currentQuestion.type === 'gd' && currentQuestion.description && (
                  <p className="text-muted-foreground text-sm bg-muted/50 p-4 rounded-lg">{currentQuestion.description}</p>
                )}

                {/* Options */}
                {currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          currentAnswer?.selectedOption === idx
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            currentAnswer?.selectedOption === idx
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-foreground">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {/* Mobile Question Navigator */}
                  <div className="lg:hidden flex items-center gap-1 overflow-x-auto max-w-[120px]">
                    {questions.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => {
                      const actualIndex = Math.max(0, currentIndex - 2) + i;
                      if (actualIndex >= questions.length) return null;
                      return (
                        <button
                          key={actualIndex}
                          onClick={() => handleJumpToQuestion(actualIndex)}
                          className={`w-6 h-6 rounded text-xs font-medium flex-shrink-0 ${
                            actualIndex === currentIndex
                              ? 'bg-primary text-primary-foreground'
                              : answers[actualIndex]?.answered
                              ? 'bg-success/20 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {actualIndex + 1}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={currentIndex === questions.length - 1 ? handleSubmitTest : handleNextQuestion}
                  >
                    {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
                    {currentIndex !== questions.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your progress will be lost and this test will not be submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continue Test
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              Exit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Up Dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Clock className="w-5 h-5" />
              Time's Up!
            </DialogTitle>
            <DialogDescription>
              Your time has run out. The test will now be submitted automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSubmitTest}>
              View Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockTest;
