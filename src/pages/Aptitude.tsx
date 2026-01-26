import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { seededShuffle, createQuestionSeed } from '@/lib/shuffle';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Calculator,
  Brain,
  BookOpen,
  RotateCcw,
  Lightbulb,
  Loader2,
  Lock,
  Star,
  Award,
  Trophy,
  Crown,
  ClipboardList,
  Timer,
  ListChecks,
  Target
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct?: number; // Now optional - only populated after server validation
  explanation?: string; // Now optional - only populated after server validation
  category: string;
  level: number;
}

interface AnswerResult {
  question: Question;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  timeSpentSeconds: number;
}

const categories = [
  { id: 'Quantitative', name: 'Quantitative', icon: Calculator },
  { id: 'Logical Reasoning', name: 'Logical Reasoning', icon: Brain },
  { id: 'Verbal Ability', name: 'Verbal Ability', icon: BookOpen },
];

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const Aptitude = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingAnswer, setValidatingAnswer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [questionAnswersHistory, setQuestionAnswersHistory] = useState<AnswerResult[]>([]);
  const questionStartTime = useRef<number>(Date.now());

  const categoryQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : [];
  
  const { progress, loading: progressLoading } = useLevelProgress(
    user?.id,
    'aptitude',
    selectedCategory,
    categoryQuestions
  );

  useEffect(() => {
    fetchQuestions();
    fetchAnsweredQuestions();
  }, [user]);

  const fetchQuestions = async () => {
    setLoading(true);
    // Use public view that doesn't expose correct_answer
    const { data, error } = await supabase
      .from('aptitude_questions_public')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      setQuestions(data.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        // correct and explanation are NOT included - server validates answers
        category: q.category,
        level: (q as any).level || 1
      })));
    }
    setLoading(false);
  };
  const fetchAnsweredQuestions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'aptitude');

    if (!error && data) {
      setAnsweredQuestions(new Set(data.map(p => p.question_id)));
    }
  };

  const filteredQuestions = selectedCategory && selectedLevel
    ? questions.filter(q => q.category === selectedCategory && q.level === selectedLevel)
    : [];

  // Apply deterministic shuffle based on user ID, category, and level
  // This ensures each user gets different questions but in a consistent order
  const shuffledQuestions = selectedCategory && selectedLevel && filteredQuestions.length > 0
    ? seededShuffle(
        filteredQuestions,
        createQuestionSeed(user?.id, selectedCategory, selectedLevel)
      )
    : filteredQuestions;

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const totalQuestionsInLevel = shuffledQuestions.length;
  const sessionAccuracy = score.attempted > 0 ? Math.round((score.correct / score.attempted) * 100) : 0;
  const sessionTimeSpentSeconds = questionAnswersHistory.reduce((sum, h) => sum + (h.timeSpentSeconds || 0), 0);
  const avgTimePerAttemptSeconds = score.attempted > 0 ? Math.round(sessionTimeSpentSeconds / score.attempted) : 0;
  const remainingQuestions = Math.max(0, totalQuestionsInLevel - (currentQuestionIndex + 1));

  const handleAnswerSelect = async (index: number) => {
    if (selectedAnswer !== null || !currentQuestion || validatingAnswer) return;
    
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
    setSelectedAnswer(index);
    setValidatingAnswer(true);

    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No session available');
        setValidatingAnswer(false);
        return;
      }

      // Call server-side validation
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-answer', {
        body: {
          questionId: currentQuestion.id,
          questionType: 'aptitude',
          selectedAnswer: index
        }
      });

      if (validationError) {
        console.error('Validation error:', validationError);
        setValidatingAnswer(false);
        return;
      }

      const isCorrect = validationResult.isCorrect;
      
      setScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        attempted: prev.attempted + 1
      }));

      // Store answer with correct answer and explanation from server
      setQuestionAnswersHistory(prev => [...prev, {
        question: currentQuestion,
        selectedAnswerIndex: index,
        isCorrect,
        correctAnswer: validationResult.correctAnswer,
        explanation: validationResult.explanation,
        timeSpentSeconds: timeSpent
      }]);

      if (user && !answeredQuestions.has(currentQuestion.id)) {
        const { error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            question_type: 'aptitude',
            question_id: currentQuestion.id,
            is_correct: isCorrect,
            time_spent_seconds: timeSpent
          });

        if (error) {
          console.error('Error saving progress:', error);
        } else {
          setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
        }
      }
    } catch (error) {
      console.error('Error validating answer:', error);
    } finally {
      setValidatingAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      questionStartTime.current = Date.now();
    } else {
      // All questions answered - show results
      setIsLevelComplete(true);
    }
  };

  const handleReset = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore({ correct: 0, attempted: 0 });
    setIsLevelComplete(false);
    setQuestionAnswersHistory([]);
    questionStartTime.current = Date.now();
  };

  const getOptionStyle = (index: number) => {
    if (!currentQuestion) return '';
    // During question phase, all options look the same - no visual feedback
    if (!isLevelComplete) {
      if (selectedAnswer === null) {
        return 'bg-muted/50 hover:bg-muted border-border hover:border-primary/50';
      }
      // Even after selecting, don't show correct/incorrect until results screen
      return 'bg-muted/30 border-border opacity-50';
    }
    // After level complete, show correct/incorrect styling on results screen
    if (index === currentQuestion.correct) {
      return 'bg-success/10 border-success text-success';
    }
    if (index === selectedAnswer && index !== currentQuestion.correct) {
      return 'bg-destructive/10 border-destructive text-destructive';
    }
    return 'bg-muted/30 border-border opacity-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Aptitude MCQs</span>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden sm:inline-flex border-border hover:bg-muted"
                  disabled={!selectedCategory || !selectedLevel || totalQuestionsInLevel === 0}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Aptitude Sheet
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Aptitude Sheet
                  </SheetTitle>
                  <SheetDescription>
                    Quick session summary, progress, and a fast review.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <ListChecks className="h-4 w-4" />
                        Attempted
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {score.attempted}/{totalQuestionsInLevel}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <Target className="h-4 w-4" />
                        Accuracy
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {sessionAccuracy}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <Timer className="h-4 w-4" />
                        Avg / Q
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {avgTimePerAttemptSeconds}s
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <ChevronRight className="h-4 w-4" />
                        Remaining
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {remainingQuestions}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/70">Level progress</span>
                      <span className="font-medium text-foreground">
                        {Math.min(100, Math.round(((currentQuestionIndex + 1) / Math.max(1, totalQuestionsInLevel)) * 100))}%
                      </span>
                    </div>
                    <Progress value={Math.round(((currentQuestionIndex + 1) / Math.max(1, totalQuestionsInLevel)) * 100)} />
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedCategory && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
                          {selectedCategory}
                        </span>
                      )}
                      {selectedLevel && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          Level {selectedLevel}
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Quick review (latest)</h3>
                      <span className="text-xs text-foreground/60">
                        {questionAnswersHistory.length} answered
                      </span>
                    </div>
                    {questionAnswersHistory.length === 0 ? (
                      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground/70">
                        Answer a few questions to see your review sheet here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...questionAnswersHistory].slice(-5).reverse().map((h, idx) => (
                          <div key={`${h.question.id}-${idx}`} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-start gap-2">
                              {h.isCorrect ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                              ) : (
                                <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-foreground">
                                  {h.question.question}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                                  <span>Time: {h.timeSpentSeconds}s</span>
                                  <span className="text-foreground/40">•</span>
                                  <span>
                                    Your answer: {String.fromCharCode(65 + h.selectedAnswerIndex)}
                                  </span>
                                  <span className="text-foreground/40">•</span>
                                  <span>
                                    Correct: {String.fromCharCode(65 + h.correctAnswer)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="rounded-xl border border-border bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">Tip</div>
                        <div className="text-sm text-muted-foreground">
                          If your accuracy drops below 60%, pause and review the last 3 explanations before continuing.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-border hover:bg-muted"
                      onClick={() => navigate('/performance')}
                    >
                      View Performance
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-hero hover:opacity-90 text-primary-foreground"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <span className="text-sm font-medium text-primary">
                {score.correct}/{score.attempted}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!selectedCategory ? (
          /* Category Cards */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Select a Category
              </h1>
              <p className="text-muted-foreground">
                Choose a category to start practicing aptitude questions.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group bg-card rounded-2xl shadow-card border border-border p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <cat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {questions.filter(q => q.category === cat.id).length} questions
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedLevel ? (
          /* Level Cards */
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-primary hover:underline mb-6"
            >
              ← Back to Categories
            </button>
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Select a Level
              </h1>
              <p className="text-muted-foreground">
                Complete each level with 80%+ accuracy to unlock the next.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {levelConfig.map((config, index) => {
                const level = index + 1;
                const levelData = progress[level] || { totalQuestions: 0, answeredQuestions: 0, accuracy: 0, isUnlocked: level === 1 };
                const Icon = config.icon;
                const levelQuestions = categoryQuestions.filter(q => q.level === level);

                return (
                  <button
                    key={level}
                    onClick={() => levelData.isUnlocked && setSelectedLevel(level)}
                    disabled={!levelData.isUnlocked}
                    className={`group bg-card rounded-2xl shadow-card border border-border p-6 text-center transition-all relative overflow-hidden ${
                      levelData.isUnlocked 
                        ? 'hover:border-primary/50 hover:shadow-lg cursor-pointer' 
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!levelData.isUnlocked && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                          <Lock className="w-8 h-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Need 80% in Level {level - 1}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className={`w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4 ${
                      levelData.isUnlocked ? 'group-hover:bg-primary/20' : ''
                    } transition-colors`}>
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    
                    <h3 className="font-semibold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {levelQuestions.length} questions
                    </p>
                    
                    {levelData.isUnlocked && levelData.answeredQuestions > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.round((levelData.answeredQuestions / levelData.totalQuestions) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {levelData.answeredQuestions}/{levelData.totalQuestions} • {levelData.accuracy}% accuracy
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : shuffledQuestions.length === 0 ? (
          <div className="text-center py-12">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-primary hover:underline mb-4"
            >
              ← Back to Levels
            </button>
            <p className="text-muted-foreground">No questions available in this level yet.</p>
          </div>
        ) : isLevelComplete ? (
          // Results Screen
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelectedLevel(null)}
              className="text-sm text-primary hover:underline mb-6"
            >
              ← Back to Levels
            </button>

            {/* Results Summary Card */}
            <div className="bg-card rounded-3xl shadow-card border border-border p-8 mb-8 text-center animate-scale-in">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-hero flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 text-primary-foreground" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Level Complete!
              </h1>
              
              <p className="text-muted-foreground mb-8">
                You have completed all {shuffledQuestions.length} questions in this level.
              </p>

              {/* Score Display */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-success/10 rounded-2xl border border-success/30 p-6">
                  <p className="text-muted-foreground text-sm mb-1">Total Marks</p>
                  <p className="text-3xl font-bold text-success">
                    {score.correct}/{shuffledQuestions.length}
                  </p>
                </div>
                <div className="bg-primary/10 rounded-2xl border border-primary/30 p-6">
                  <p className="text-muted-foreground text-sm mb-1">Accuracy</p>
                  <p className="text-3xl font-bold text-primary">
                    {Math.round((score.correct / shuffledQuestions.length) * 100)}%
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleReset()}
                className="bg-gradient-hero hover:opacity-90 text-primary-foreground mb-4"
              >
                <RotateCcw className="mr-2 w-5 h-5" />
                Retake Level
              </Button>
            </div>

            {/* All Questions with Explanations */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">Review Your Answers</h2>
              
              {questionAnswersHistory.map((item, index) => (
                <div
                  key={index}
                  className={`bg-card rounded-2xl shadow-card border-2 p-6 transition-all ${
                    item.isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {item.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="text-sm font-medium text-muted-foreground">
                          Question {index + 1}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {item.question.question}
                      </h3>
                    </div>
                  </div>

                  {/* Options with user answer */}
                  <div className="space-y-2 mb-4">
                    {item.question.options.map((option, optionIndex) => {
                      const isUserAnswer = optionIndex === item.selectedAnswerIndex;
                      const isCorrectAnswer = optionIndex === item.correctAnswer;

                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                            isCorrectAnswer
                              ? 'bg-success/10 border-success text-success'
                              : isUserAnswer && !isCorrectAnswer
                              ? 'bg-destructive/10 border-destructive text-destructive'
                              : 'bg-muted/30 border-border'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-lg bg-background flex items-center justify-center text-xs font-medium">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="flex-1 text-sm">{option}</span>
                          {isCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Explanation</p>
                        <p className="text-muted-foreground text-sm">{item.explanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Action */}
            <div className="mt-8 flex justify-center gap-4">
              <Button
                onClick={() => setSelectedLevel(null)}
                variant="outline"
                className="border-border hover:bg-muted"
              >
                Back to Levels
              </Button>
              <Button
                onClick={() => handleReset()}
                className="bg-gradient-hero hover:opacity-90 text-primary-foreground"
              >
                <RotateCcw className="mr-2 w-5 h-5" />
                Retake Level
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedLevel(null)}
                  className="text-sm text-primary hover:underline"
                >
                  ← Back to Levels
                </button>
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
                </span>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-hero transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            {currentQuestion && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-card rounded-3xl shadow-card border border-border p-6 md:p-8 animate-scale-in">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary/10 text-secondary">
                      {currentQuestion.category}
                    </span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                      Level {currentQuestion.level}
                    </span>
                    {answeredQuestions.has(currentQuestion.id) && (
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-success/10 text-success">
                        Already Attempted
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6">
                    {currentQuestion.question}
                  </h2>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={selectedAnswer !== null || validatingAnswer}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${getOptionStyle(index)}`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-sm font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {validatingAnswer && selectedAnswer === index && (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Message during question phase */}
                  {selectedAnswer !== null && !isLevelComplete && !validatingAnswer && (
                    <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/30 animate-slide-up">
                      <p className="text-center text-foreground font-medium">
                        ✓ Answer recorded. Continue to the next question to see explanations and results at the end!
                      </p>
                    </div>
                  )}

                  {validatingAnswer && (
                    <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border animate-slide-up">
                      <p className="text-center text-muted-foreground font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating your answer...
                      </p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="mt-8 flex justify-end">
                    {currentQuestionIndex < shuffledQuestions.length - 1 ? (
                      <Button
                        onClick={handleNext}
                        disabled={selectedAnswer === null}
                        className="bg-gradient-hero hover:opacity-90 text-primary-foreground"
                      >
                        Next Question
                        <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        disabled={selectedAnswer === null}
                        className="bg-gradient-hero hover:opacity-90 text-primary-foreground"
                      >
                        View Results
                        <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Aptitude;
