import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
  TrendingDown,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Clock,
  Trophy,
  Calendar,
  Activity,
  PieChart,
  Brain
} from 'lucide-react';

interface CategoryPerformance {
  category: string;
  total: number;
  correct: number;
  percentage: number;
  type: 'aptitude' | 'technical' | 'mock';
}

interface MockTestResult {
  testName: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
  timeTaken: number;
}

interface OverallStats {
  totalQuestions: number;
  correctAnswers: number;
  overallAccuracy: number;
  totalTimeSpent: number;
  mockTestsTaken: number;
  mockTestsPassed: number;
  streakDays: number;
}

const PerformanceReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [mockTestResults, setMockTestResults] = useState<MockTestResult[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    overallAccuracy: 0,
    totalTimeSpent: 0,
    mockTestsTaken: 0,
    mockTestsPassed: 0,
    streakDays: 0
  });
  const [weakAreas, setWeakAreas] = useState<CategoryPerformance[]>([]);
  const [strongAreas, setStrongAreas] = useState<CategoryPerformance[]>([]);
  const [activeType, setActiveType] = useState<'all' | 'aptitude' | 'technical' | 'mock'>('all');

  useEffect(() => {
    if (user) {
      fetchAllPerformanceData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchAllPerformanceData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Fetch aptitude questions for category mapping
      const { data: aptitudeQuestions } = await supabase
        .from('aptitude_questions_public')
        .select('id, category');

      // Fetch technical MCQ questions for category mapping
      const { data: techQuestions } = await supabase
        .from('technical_mcq_questions_public')
        .select('id, category');

      // Fetch mock test results
      const { data: mockResults, error: mockError } = await supabase
        .from('mock_test_results')
        .select(`
          score,
          total_questions,
          percentage,
          passed,
          completed_at,
          time_taken_seconds,
          mock_tests (name)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (mockError) throw mockError;

      // Process overall statistics
      const totalQuestions = progressData?.length || 0;
      const correctAnswers = progressData?.filter(p => p.is_correct).length || 0;
      const totalTimeSpent = progressData?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;
      const mockTestsTaken = mockResults?.length || 0;
      const mockTestsPassed = mockResults?.filter(m => m.passed).length || 0;

      // Calculate streak (simplified - consecutive days with activity)
      const uniqueDates = new Set(
        progressData?.map(p => new Date(p.attempted_at).toDateString()) || []
      );
      const streakDays = uniqueDates.size;

      setOverallStats({
        totalQuestions,
        correctAnswers,
        overallAccuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        totalTimeSpent,
        mockTestsTaken,
        mockTestsPassed,
        streakDays
      });

      // Process category-wise performance
      const categoryMap = new Map<string, { total: number; correct: number; type: 'aptitude' | 'technical' | 'mock' }>();

      progressData?.forEach((p) => {
        let category = 'General';
        let type: 'aptitude' | 'technical' | 'mock' = 'aptitude';
        
        if (p.question_type === 'aptitude') {
          const q = aptitudeQuestions?.find(aq => aq.id === p.question_id);
          category = q?.category || 'Aptitude - General';
          type = 'aptitude';
        } else if (p.question_type === 'technical_mcq' || p.question_type === 'technical') {
          const q = techQuestions?.find(tq => tq.id === p.question_id);
          category = q?.category || 'Technical - General';
          type = 'technical';
        } else if (p.question_type === 'mock_test') {
          category = 'Mock Test Questions';
          type = 'mock';
        }

        const current = categoryMap.get(category) || { total: 0, correct: 0, type };
        categoryMap.set(category, {
          total: current.total + 1,
          correct: current.correct + (p.is_correct ? 1 : 0),
          type
        });
      });

      const performanceArray: CategoryPerformance[] = Array.from(categoryMap.entries())
        .map(([cat, data]) => ({
          category: cat,
          total: data.total,
          correct: data.correct,
          percentage: Math.round((data.correct / data.total) * 100),
          type: data.type
        }))
        .sort((a, b) => b.total - a.total); // Sort by most practiced

      setCategoryPerformance(performanceArray);

      // Identify weak and strong areas (minimum 3 attempts)
      const validAreas = performanceArray.filter(p => p.total >= 3);
      setWeakAreas(validAreas.filter(p => p.percentage < 60).sort((a, b) => a.percentage - b.percentage));
      setStrongAreas(validAreas.filter(p => p.percentage >= 80).sort((a, b) => b.percentage - a.percentage));

      // Process mock test results
      const mockPerf: MockTestResult[] = (mockResults || []).map((r: any) => ({
        testName: r.mock_tests?.name || 'Mock Test',
        score: r.score,
        total: r.total_questions,
        percentage: r.percentage,
        passed: r.passed,
        completedAt: r.completed_at,
        timeTaken: r.time_taken_seconds || 0
      }));
      setMockTestResults(mockPerf);

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (percentage >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getWeightedAccuracy = (items: CategoryPerformance[]) => {
    const total = items.reduce((s, i) => s + i.total, 0);
    const correct = items.reduce((s, i) => s + i.correct, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  };

  const aptitudePerf = categoryPerformance.filter(p => p.type === 'aptitude');
  const technicalPerf = categoryPerformance.filter(p => p.type === 'technical');
  const mockPerf = categoryPerformance.filter(p => p.type === 'mock');
  const filteredCategoryPerformance =
    activeType === 'all' ? categoryPerformance : categoryPerformance.filter(p => p.type === activeType);

  const getTypeColor = (type: 'aptitude' | 'technical' | 'mock') => {
    switch (type) {
      case 'aptitude': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'technical': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'mock': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12">
          <CardContent>
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Login Required</h3>
            <p className="text-muted-foreground mb-6">
              Please login to view your performance report
            </p>
            <Button onClick={() => navigate('/auth')} size="lg">
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your progress and identify areas for improvement
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            <p className="mt-6 text-muted-foreground">Analyzing your performance data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.totalQuestions}</p>
                      <p className="text-sm text-muted-foreground">Questions Solved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-green-500/20">
                      <Target className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.overallAccuracy}%</p>
                      <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{formatTime(overallStats.totalTimeSpent)}</p>
                      <p className="text-sm text-muted-foreground">Time Practiced</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/20">
                      <Activity className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {overallStats.mockTestsPassed}/{overallStats.mockTestsTaken}
                      </p>
                      <p className="text-sm text-muted-foreground">Mock Tests Passed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-violet-500/10 border-violet-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-violet-500/20">
                      <Calendar className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.streakDays}</p>
                      <p className="text-sm text-muted-foreground">Active Days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-500" />
                      Aptitude
                    </span>
                    <span className="text-sm font-bold text-foreground">{getWeightedAccuracy(aptitudePerf)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={getWeightedAccuracy(aptitudePerf)} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {aptitudePerf.reduce((s, i) => s + i.correct, 0)}/{aptitudePerf.reduce((s, i) => s + i.total, 0) || 0} correct
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      Technical
                    </span>
                    <span className="text-sm font-bold text-foreground">{getWeightedAccuracy(technicalPerf)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={getWeightedAccuracy(technicalPerf)} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {technicalPerf.reduce((s, i) => s + i.correct, 0)}/{technicalPerf.reduce((s, i) => s + i.total, 0) || 0} correct
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      Mock
                    </span>
                    <span className="text-sm font-bold text-foreground">{getWeightedAccuracy(mockPerf)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={getWeightedAccuracy(mockPerf)} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mockPerf.reduce((s, i) => s + i.correct, 0)}/{mockPerf.reduce((s, i) => s + i.total, 0) || 0} correct
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Weak Areas Alert */}
            {weakAreas.length > 0 && (
              <Card className="bg-red-500/5 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                    <TrendingDown className="w-5 h-5" />
                    Areas Needing Improvement ({weakAreas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Focus on these topics to boost your overall performance:
                  </p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {weakAreas.slice(0, 6).map((area, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-red-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium truncate">{area.category}</span>
                        </div>
                        <span className="text-sm font-bold text-red-500">{area.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-background rounded-lg border border-border">
                    <p className="text-sm flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Recommendation:</strong> Review formulas in the{' '}
                        <button 
                          onClick={() => navigate('/cheat-codes')}
                          className="text-primary underline hover:no-underline"
                        >
                          Aptitude Cheat Codes
                        </button>
                        {' '}section, then practice more questions.
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strong Areas */}
            {strongAreas.length > 0 && (
              <Card className="bg-green-500/5 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                    <TrendingUp className="w-5 h-5" />
                    Your Strong Areas ({strongAreas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {strongAreas.slice(0, 6).map((area, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-green-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium truncate">{area.category}</span>
                        </div>
                        <span className="text-sm font-bold text-green-500">{area.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category-wise Detailed Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Category-wise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryPerformance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Practice Data Yet</h3>
                    <p className="mb-6">Start practicing to see your category-wise performance!</p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => navigate('/aptitude')} variant="outline">
                        Practice Aptitude
                      </Button>
                      <Button onClick={() => navigate('/technical')}>
                        Practice Technical
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Tabs value={activeType} onValueChange={(v) => setActiveType(v as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="aptitude">Aptitude</TabsTrigger>
                      <TabsTrigger value="technical">Technical</TabsTrigger>
                      <TabsTrigger value="mock">Mock</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeType} className="mt-4">
                      {filteredCategoryPerformance.length === 0 ? (
                        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-muted-foreground">
                          No data for this section yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredCategoryPerformance.map((item, idx) => (
                            <div key={idx} className="space-y-2 p-4 bg-muted/30 rounded-lg">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  {getPerformanceIcon(item.percentage)}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium truncate">{item.category}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>
                                        {item.type}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {item.correct}/{item.total} correct
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3">
                                  <span className={`font-bold text-lg ${getPerformanceColor(item.percentage)}`}>
                                    {item.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getProgressColor(item.percentage)} transition-all duration-700`}
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {/* Mock Test History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Mock Test History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mockTestResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Mock Tests Taken</h3>
                    <p className="mb-6">Take a mock test to evaluate your overall preparation!</p>
                    <Button onClick={() => navigate('/mock-tests')}>
                      Start Mock Test
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mockTestResults.map((test, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border-2 transition-all ${
                          test.passed 
                            ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50' 
                            : 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${test.passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              {test.passed ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              ) : (
                                <XCircle className="w-6 h-6 text-red-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{test.testName}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(test.completedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                {test.timeTaken > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(test.timeTaken)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${test.passed ? 'text-green-500' : 'text-red-500'}`}>
                                {test.percentage}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {test.score}/{test.total} marks
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                              test.passed 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {test.passed ? '✓ Passed' : '✗ Failed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/70 p-4 bg-muted/30 rounded-xl">
              <span className="font-medium text-foreground/80">Performance Scale:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Excellent (≥80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Good (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Needs Improvement (&lt;60%)</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PerformanceReport;
