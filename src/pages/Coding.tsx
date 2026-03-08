import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import {
  ArrowLeft,
  CheckCircle2,
  Code,
  Lock,
  Star,
  Award,
  Trophy,
  Crown,
  RotateCcw,
  Type,
  Layers,
  Link2,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  level: number;
}

const categories = [
  { id: 'String', name: 'String', icon: Type, description: 'String manipulation & parsing' },
  { id: 'Array', name: 'Array', icon: Layers, description: 'Array operations & algorithms' },
  { id: 'LinkedList', name: 'Linked List', icon: Link2, description: 'Linked list problems' },
  { id: 'Dynamic Programming', name: 'Dynamic Programming', icon: Zap, description: 'DP & optimization' },
];

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'text-success bg-success/10';
    case 'medium': return 'text-warning bg-warning/10';
    case 'hard': return 'text-destructive bg-destructive/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

const Coding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [trackedQuestions, setTrackedQuestions] = useState<Set<string>>(new Set());

  const categoryQuestions = selectedCategory
    ? questions.filter(q => q.category === selectedCategory)
    : [];

  const { progress, loading: progressLoading } = useLevelProgress(
    user?.id,
    'coding',
    selectedCategory || '',
    categoryQuestions.map(q => ({ ...q, description: '', examples: [], approach: '', solution: '' }))
  );

  const currentCategory = categories.find(c => c.id === selectedCategory);

  useEffect(() => {
    fetchQuestions();
    if (user) fetchTrackedQuestions();
  }, [user]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_questions')
      .select('id, title, difficulty, category, level')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuestions(data.map(q => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        category: q.category,
        level: q.level || 1,
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
    if (data) setTrackedQuestions(new Set(data.map(d => d.question_id)));
  };

  if (loading || progressLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Category Selection
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Coding Round</h1>
              <p className="text-sm text-muted-foreground">Practice coding challenges</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Select Category</h2>
            <p className="text-muted-foreground">Choose a category to start practicing</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {categories.map((cat) => {
              const count = questions.filter(q => q.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group bg-card rounded-2xl shadow-lg border-2 border-border p-6 text-center hover:border-accent hover:shadow-xl transition-all"
                >
                  <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <cat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  <p className="text-sm text-muted-foreground mt-2">{count} problems</p>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // Level Selection
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{currentCategory?.name || 'Coding'}</h1>
              <p className="text-sm text-muted-foreground">Select difficulty level</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {levelConfig.map((config, idx) => {
              const level = idx + 1;
              const questionsInLevel = categoryQuestions.filter(q => q.level === level);
              const prevLevelQuestions = level > 1 ? categoryQuestions.filter(q => q.level === level - 1) : [];
              const prevLevelData = level > 1 ? (progress[level - 1] || { answeredQuestions: 0, totalQuestions: prevLevelQuestions.length }) : null;
              const isUnlocked = level === 1 || (prevLevelData && prevLevelData.totalQuestions > 0 && prevLevelData.answeredQuestions >= prevLevelData.totalQuestions);
              const levelData = progress[level] || { totalQuestions: questionsInLevel.length, answeredQuestions: 0 };
              const Icon = config.icon;

              return (
                <button
                  key={level}
                  onClick={() => isUnlocked && setSelectedLevel(level)}
                  disabled={!isUnlocked}
                  className={`group bg-card rounded-2xl shadow-lg border-2 border-border p-6 text-center transition-all relative overflow-hidden ${
                    isUnlocked ? 'hover:border-accent hover:shadow-xl cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Lock className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Complete Level {level - 1}</span>
                      </div>
                    </div>
                  )}
                  <div className={`w-14 h-14 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 ${isUnlocked ? 'group-hover:bg-primary/20' : ''} transition-colors`}>
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{config.name}</h3>
                  <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                  <p className="text-sm text-muted-foreground mt-2">{questionsInLevel.length} problems</p>
                  {isUnlocked && levelData.answeredQuestions > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${(levelData.answeredQuestions / levelData.totalQuestions) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{levelData.answeredQuestions}/{levelData.totalQuestions} completed</p>
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

  // Question List
  const filteredQuestions = categoryQuestions.filter(q => q.level === selectedLevel);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedLevel(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{currentCategory?.name} - Level {selectedLevel}</h1>
              <p className="text-sm text-muted-foreground">{filteredQuestions.length} challenges</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSelectedLevel(null); setSelectedCategory(null); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No questions available</h3>
              <p className="text-muted-foreground">Check back later for coding challenges!</p>
            </div>
          ) : (
            filteredQuestions.map((question, idx) => {
              const solved = trackedQuestions.has(question.id);
              return (
                <button
                  key={question.id}
                  onClick={() => navigate(`/coding/${question.id}`)}
                  className={`w-full bg-card rounded-xl border p-4 flex items-center gap-4 text-left hover:border-primary/40 hover:shadow-md transition-all ${
                    solved ? 'border-success/30' : 'border-border'
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-foreground flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{question.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                      {solved && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" /> Solved
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default Coding;
