import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  ArrowLeft,
  Lock,
  CheckCircle,
  Target,
  Clock,
  FileText
} from 'lucide-react';

interface LevelProgress {
  completed: boolean;
  score: number;
  totalQuestions: number;
}

const MockTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levelProgress, setLevelProgress] = useState<Record<number, LevelProgress>>({
    1: { completed: false, score: 0, totalQuestions: 20 },
    2: { completed: false, score: 0, totalQuestions: 20 },
    3: { completed: false, score: 0, totalQuestions: 20 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('question_type', 'mock_test');

      if (error) throw error;

      const progressByLevel: Record<number, { correct: number; total: number }> = {};
      
      data?.forEach((record: any) => {
        const match = record.question_id.match(/mock_level_(\d+)/);
        if (match) {
          const level = parseInt(match[1]);
          if (!progressByLevel[level]) {
            progressByLevel[level] = { correct: 0, total: 0 };
          }
          progressByLevel[level].total++;
          if (record.is_correct) {
            progressByLevel[level].correct++;
          }
        }
      });

      const newLevelProgress: Record<number, LevelProgress> = {
        1: { completed: false, score: 0, totalQuestions: 20 },
        2: { completed: false, score: 0, totalQuestions: 20 },
        3: { completed: false, score: 0, totalQuestions: 20 },
      };

      Object.entries(progressByLevel).forEach(([level, progress]) => {
        const levelNum = parseInt(level);
        if (newLevelProgress[levelNum]) {
          newLevelProgress[levelNum] = {
            completed: progress.total >= 20,
            score: progress.correct,
            totalQuestions: 20
          };
        }
      });

      setLevelProgress(newLevelProgress);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLevelUnlocked = (level: number): boolean => {
    if (level === 1) return true;
    const prevLevel = levelProgress[level - 1];
    if (!prevLevel) return false;
    return prevLevel.completed && (prevLevel.score / prevLevel.totalQuestions) >= 0.8;
  };

  const getLevelStatus = (level: number): 'locked' | 'unlocked' | 'completed' => {
    if (levelProgress[level]?.completed) return 'completed';
    if (isLevelUnlocked(level)) return 'unlocked';
    return 'locked';
  };

  const levels = [
    {
      level: 1,
      title: 'Level 1 - Foundation',
      description: 'Basic aptitude and technical questions to test your fundamentals',
      aptitudeCount: 15,
      technicalCount: 5,
    },
    {
      level: 2,
      title: 'Level 2 - Intermediate',
      description: 'Medium difficulty questions to challenge your problem-solving skills',
      aptitudeCount: 15,
      technicalCount: 5,
    },
    {
      level: 3,
      title: 'Level 3 - Advanced',
      description: 'Advanced questions to prepare you for tough interviews',
      aptitudeCount: 15,
      technicalCount: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Mock Tests</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Mock Test Levels
            </h1>
            <p className="text-muted-foreground">
              Complete each level with 80% or higher to unlock the next level. 
              Each level contains 15 aptitude and 5 technical questions.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6">
              {levels.map((levelData, idx) => {
                const status = getLevelStatus(levelData.level);
                const progress = levelProgress[levelData.level];
                const percentage = progress?.completed 
                  ? Math.round((progress.score / progress.totalQuestions) * 100) 
                  : 0;

                return (
                  <div
                    key={levelData.level}
                    className={`relative bg-card rounded-3xl p-6 shadow-card border border-border transition-all duration-300 animate-slide-up ${
                      status === 'locked' 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    onClick={() => {
                      if (status !== 'locked') {
                        navigate(`/mock-test/${levelData.level}`);
                      }
                    }}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        status === 'completed' 
                          ? 'bg-green-500/20' 
                          : status === 'unlocked' 
                            ? 'bg-gradient-to-br from-orange-500 to-red-500' 
                            : 'bg-muted'
                      }`}>
                        {status === 'locked' ? (
                          <Lock className="w-8 h-8 text-muted-foreground" />
                        ) : status === 'completed' ? (
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : (
                          <span className="text-2xl font-bold text-white">{levelData.level}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {levelData.title}
                          </h3>
                          {status === 'completed' && (
                            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                              Completed - {percentage}%
                            </span>
                          )}
                          {status === 'locked' && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              Locked
                            </span>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-4">
                          {levelData.description}
                        </p>

                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-foreground">{levelData.aptitudeCount} Aptitude Questions</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Brain className="w-4 h-4 text-secondary" />
                            <span className="text-foreground">{levelData.technicalCount} Technical Questions</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-accent" />
                            <span className="text-foreground">~30 mins</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Your Score</span>
                          <span className="font-medium text-foreground">{progress?.score}/{progress?.totalQuestions}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {status === 'locked' && levelData.level > 1 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Complete Level {levelData.level - 1} with 80% or higher to unlock this level.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MockTests;
