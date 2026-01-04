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

interface MockTest {
  id: string;
  name: string;
  description: string | null;
  difficulty: string;
  total_questions: number;
  aptitude_questions: number | null;
  technical_questions: number | null;
  time_minutes: number;
  is_active: boolean | null;
}

interface LevelProgress {
  completed: boolean;
  score: number;
  totalQuestions: number;
}

const MockTests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [levelProgress, setLevelProgress] = useState<Record<string, LevelProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTests();
  }, []);

  useEffect(() => {
    if (user && mockTests.length > 0) {
      fetchProgress();
    }
  }, [user, mockTests]);

  const fetchMockTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMockTests(data || []);
    } catch (error) {
      console.error('Error fetching mock tests:', error);
    } finally {
      setLoading(false);
    }
  };

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

      const progressByTest: Record<string, { correct: number; total: number }> = {};
      
      data?.forEach((record: any) => {
        const testId = record.question_id.split('_')[0];
        if (!progressByTest[testId]) {
          progressByTest[testId] = { correct: 0, total: 0 };
        }
        progressByTest[testId].total++;
        if (record.is_correct) {
          progressByTest[testId].correct++;
        }
      });

      const newLevelProgress: Record<string, LevelProgress> = {};

      mockTests.forEach((test) => {
        const progress = progressByTest[test.id];
        newLevelProgress[test.id] = {
          completed: progress ? progress.total >= test.total_questions : false,
          score: progress?.correct || 0,
          totalQuestions: test.total_questions
        };
      });

      setLevelProgress(newLevelProgress);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTestUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const prevTest = mockTests[index - 1];
    if (!prevTest) return false;
    const prevProgress = levelProgress[prevTest.id];
    if (!prevProgress) return false;
    return prevProgress.completed && (prevProgress.score / prevProgress.totalQuestions) >= 0.8;
  };

  const getTestStatus = (testId: string, index: number): 'locked' | 'unlocked' | 'completed' => {
    if (levelProgress[testId]?.completed) return 'completed';
    if (isTestUnlocked(index)) return 'unlocked';
    return 'locked';
  };

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
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : mockTests.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Mock Tests Available</h3>
              <p className="text-muted-foreground">Check back later for new mock tests.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {mockTests.map((test, idx) => {
                const status = getTestStatus(test.id, idx);
                const progress = levelProgress[test.id];
                const percentage = progress?.completed 
                  ? Math.round((progress.score / progress.totalQuestions) * 100) 
                  : 0;

                return (
                  <div
                    key={test.id}
                    className={`relative bg-card rounded-3xl p-6 shadow-card border border-border transition-all duration-300 animate-slide-up ${
                      status === 'locked' 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    onClick={() => {
                      if (status !== 'locked') {
                        navigate(`/mock-test/${test.id}`);
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
                          <span className="text-2xl font-bold text-white">{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {test.name}
                          </h3>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                            test.difficulty === 'Easy' 
                              ? 'text-green-500 bg-green-500/10' 
                              : test.difficulty === 'Medium' 
                                ? 'text-yellow-500 bg-yellow-500/10' 
                                : 'text-red-500 bg-red-500/10'
                          }`}>
                            {test.difficulty}
                          </span>
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
                          {test.description || 'Complete this mock test to assess your skills.'}
                        </p>

                        <div className="flex flex-wrap gap-4">
                          {(test.aptitude_questions || 0) > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="text-foreground">{test.aptitude_questions} Aptitude</span>
                            </div>
                          )}
                          {(test.technical_questions || 0) > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Brain className="w-4 h-4 text-secondary" />
                              <span className="text-foreground">{test.technical_questions} Technical</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-accent" />
                            <span className="text-foreground">{test.time_minutes} mins</span>
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

                    {status === 'locked' && idx > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Complete "{mockTests[idx - 1]?.name}" with 80% or higher to unlock this level.
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
