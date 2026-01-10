import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { seededShuffle, createQuestionSeed } from '@/lib/shuffle';
import { toast } from '@/hooks/use-toast';
import LevelCard from '@/components/LevelCard';
import CodeEditor from '@/components/CodeEditor';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Copy,
  Code,
  Loader2,
  Lock,
  Lightbulb,
  Play,
  Star,
  Award,
  Trophy,
  Crown,
  RotateCcw
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

const categories = [
  { id: 'all', name: 'All Categories', icon: Code },
];

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const Coding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validatingCode, setValidatingCode] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  const [showApproach, setShowApproach] = useState<Record<string, boolean>>({});
  const [trackedQuestions, setTrackedQuestions] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const levelQuestions = selectedLevel
    ? questions.filter(q => q.level === selectedLevel && (selectedCategory === 'all' || q.category === selectedCategory))
    : [];

  const { progress, loading: progressLoading } = useLevelProgress(
    user?.id,
    'coding',
    selectedCategory || 'all',
    levelQuestions
  );

  useEffect(() => {
    fetchQuestions();
    if (user) {
      fetchTrackedQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      setQuestions(data.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        examples: (q.examples as { input: string; output: string }[]) || [],
        approach: q.approach,
        solution: q.solution,
        category: q.category,
        level: q.level || 1
      })));
    }
    setLoading(false);
  };

  const fetchTrackedQuestions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_progress')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_type', 'coding');

    if (data) {
      setTrackedQuestions(new Set(data.map(d => d.question_id)));
    }
  };

  const fetchSavedCode = async (questionId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('user_code_solutions')
      .select('code, language, validation_result, is_validated')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle();

    if (data) {
      setUserCode(prev => ({ ...prev, [questionId]: data.code }));
      setSelectedLanguage(prev => ({ ...prev, [questionId]: data.language }));
      if (data.is_validated && data.validation_result) {
        const result = data.validation_result as unknown as ValidationResult;
        setValidationResults(prev => ({ ...prev, [questionId]: result }));
      }
    }
  };

  const handleExpand = async (questionId: string) => {
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(questionId);
      if (!userCode[questionId]) {
        await fetchSavedCode(questionId);
      }
    }
  };

  const validateCode = async (questionId: string) => {
    if (!user || !userCode[questionId]) {
      toast({
        title: 'Error',
        description: 'Please write some code first',
        variant: 'destructive'
      });
      return;
    }

    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    setValidatingCode(prev => ({ ...prev, [questionId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('validate-code', {
        body: {
          code: userCode[questionId],
          language: selectedLanguage[questionId] || 'javascript',
          question: `${question.title}\n\n${question.description}`,
          examples: question.examples
        }
      });

      if (error) throw error;

      const result: ValidationResult = {
        isValid: data.isValid,
        feedback: data.feedback,
        score: data.score
      };

      setValidationResults(prev => ({ ...prev, [questionId]: result }));

      // Save to database
      await saveCode(questionId, result);

      // Track progress if valid
      if (result.isValid && !trackedQuestions.has(questionId)) {
        await supabase.from('user_progress').insert([{
          user_id: user.id,
          question_id: questionId,
          question_type: 'coding',
          is_correct: true,
          time_spent_seconds: 0
        }]);
        setTrackedQuestions(prev => new Set([...prev, questionId]));
      }

      toast({
        title: result.isValid ? 'Solution Accepted!' : 'Try Again',
        description: result.feedback.slice(0, 100),
        variant: result.isValid ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error validating code:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate code. Please try again.',
        variant: 'destructive'
      });
    }

    setValidatingCode(prev => ({ ...prev, [questionId]: false }));
  };

  const saveCode = async (questionId: string, validationResult?: ValidationResult) => {
    if (!user) return;

    const validationData = validationResult 
      ? { isValid: validationResult.isValid, feedback: validationResult.feedback, score: validationResult.score }
      : null;
    
    const { error } = await supabase
      .from('user_code_solutions')
      .upsert([{
        user_id: user.id,
        question_id: questionId,
        code: userCode[questionId] || '',
        language: selectedLanguage[questionId] || 'javascript',
        is_validated: validationResult?.isValid || false,
        validation_result: validationData
      }], {
        onConflict: 'user_id,question_id'
      });

    if (error) {
      console.error('Error saving code:', error);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-success bg-success/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'hard': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const seededShuffle = <T,>(array: T[], seed: number): T[] => {
    const result = [...array];
    let currentSeed = seed;
    const random = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const createQuestionSeed = (userId: string, level: number): number => {
    let hash = 0;
    const str = `${userId}-coding-${level}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  if (loading || progressLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Category Selection Screen
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coding Round</h1>
                <p className="text-sm text-muted-foreground">Practice coding challenges</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Select Category</h2>
            <p className="text-muted-foreground">Choose a category to start practicing</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="group bg-card rounded-2xl shadow-lg border-2 border-border p-6 text-center hover:border-accent hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4 group-hover:bg-accent/30 transition-colors">
                  <cat.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">{cat.name}</h3>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Level Selection Screen
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coding Round</h1>
                <p className="text-sm text-muted-foreground">Select difficulty level</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose Level</h2>
            <p className="text-muted-foreground">Progress through levels by completing challenges</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {levelConfig.map((config, idx) => {
              const level = idx + 1;
              const levelData = progress[level] || { 
                level, 
                totalQuestions: 0, 
                answeredQuestions: 0, 
                correctAnswers: 0, 
                accuracy: 0, 
                isUnlocked: level === 1 
              };
              const Icon = config.icon;

              return (
                <button
                  key={level}
                  onClick={() => levelData.isUnlocked && setSelectedLevel(level)}
                  disabled={!levelData.isUnlocked}
                  className={`group bg-card rounded-2xl shadow-lg border-2 border-border p-6 text-center transition-all relative overflow-hidden ${
                    levelData.isUnlocked
                      ? 'hover:border-accent hover:shadow-xl cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {!levelData.isUnlocked && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Lock className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Complete Level {level - 1}</span>
                      </div>
                    </div>
                  )}

                  <div className={`w-14 h-14 mx-auto rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mb-4 ${
                    levelData.isUnlocked ? 'group-hover:bg-accent/30' : ''
                  } transition-colors`}>
                    <Icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground">{config.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{config.subtitle}</p>

                  {levelData.totalQuestions > 0 && (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${(levelData.answeredQuestions / levelData.totalQuestions) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {levelData.answeredQuestions}/{levelData.totalQuestions} attempted
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // Questions List Screen
  const filteredQuestions = questions.filter(q =>
    q.level === selectedLevel && (selectedCategory === 'all' || q.category === selectedCategory)
  );

  const shuffledQuestions = user
    ? seededShuffle(filteredQuestions, createQuestionSeed(user.id, selectedLevel))
    : filteredQuestions;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedLevel(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Coding Round - Level {selectedLevel}</h1>
                <p className="text-sm text-muted-foreground">{shuffledQuestions.length} challenges</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSelectedLevel(null); setSelectedCategory(null); }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {shuffledQuestions.map((question, idx) => (
            <div
              key={question.id}
              className={`bg-card rounded-xl border-2 transition-all ${
                expandedQuestion === question.id ? 'border-accent shadow-lg' : 'border-border'
              } ${trackedQuestions.has(question.id) ? 'ring-2 ring-success/30' : ''}`}
            >
              {/* Question Header */}
              <button
                onClick={() => handleExpand(question.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-foreground">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{question.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                      {trackedQuestions.has(question.id) && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" />
                          Solved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {expandedQuestion === question.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedQuestion === question.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Description */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{question.description}</p>
                  </div>

                  {/* Examples */}
                  {question.examples && question.examples.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground text-sm">Examples:</h4>
                      {question.examples.map((example, i) => (
                        <div key={i} className="bg-muted rounded-lg p-3 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">Input:</span>{' '}
                            <code className="text-primary">{example.input}</code>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-foreground">Output:</span>{' '}
                            <code className="text-primary">{example.output}</code>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Language Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Language:</span>
                    <Select
                      value={selectedLanguage[question.id] || 'javascript'}
                      onValueChange={(val) => setSelectedLanguage(prev => ({ ...prev, [question.id]: val }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Code Editor */}
                  <CodeEditor
                    value={userCode[question.id] || ''}
                    onChange={(val) => setUserCode(prev => ({ ...prev, [question.id]: val }))}
                    language={selectedLanguage[question.id] || 'javascript'}
                    height="300px"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => validateCode(question.id)}
                      disabled={validatingCode[question.id]}
                      className="flex items-center gap-2"
                    >
                      {validatingCode[question.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Run & Validate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => saveCode(question.id)}
                    >
                      Save Code
                    </Button>
                  </div>

                  {/* Validation Result */}
                  {validationResults[question.id] && (
                    <div className={`p-4 rounded-lg ${
                      validationResults[question.id].isValid
                        ? 'bg-success/10 border border-success/30'
                        : 'bg-destructive/10 border border-destructive/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {validationResults[question.id].isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Lightbulb className="w-5 h-5 text-destructive" />
                        )}
                        <span className={`font-medium ${
                          validationResults[question.id].isValid ? 'text-success' : 'text-destructive'
                        }`}>
                          {validationResults[question.id].isValid ? 'Solution Accepted!' : 'Needs Improvement'}
                        </span>
                        <span className="text-sm text-muted-foreground ml-auto">
                          Score: {validationResults[question.id].score}/100
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {validationResults[question.id].feedback}
                      </p>
                    </div>
                  )}

                  {/* Approach Toggle */}
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApproach(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
                      className="text-muted-foreground"
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      {showApproach[question.id] ? 'Hide' : 'Show'} Approach
                    </Button>

                    {showApproach[question.id] && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{question.approach}</p>
                      </div>
                    )}
                  </div>

                  {/* Solution Toggle */}
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSolution(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
                      className="text-muted-foreground"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      {showSolution[question.id] ? 'Hide' : 'Show'} Solution
                    </Button>

                    {showSolution[question.id] && (
                      <div className="mt-2 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-10"
                          onClick={() => handleCopy(question.solution, question.id)}
                        >
                          {copiedId === question.id ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <CodeEditor
                          value={question.solution}
                          onChange={() => {}}
                          language="javascript"
                          height="200px"
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {shuffledQuestions.length === 0 && (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No questions available</h3>
              <p className="text-muted-foreground">Check back later for coding challenges!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Coding;
