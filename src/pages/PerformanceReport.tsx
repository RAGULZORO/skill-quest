import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';
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
  Brain,
  Zap,
  Star,
  ArrowRight,
  Flame,
  ChevronRight,
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

interface DailyAccuracy {
  date: string;
  accuracy: number;
  questions: number;
}

interface Recommendation {
  title: string;
  description: string;
  action: string;
  path: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
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
    streakDays: 0,
  });
  const [weakAreas, setWeakAreas] = useState<CategoryPerformance[]>([]);
  const [strongAreas, setStrongAreas] = useState<CategoryPerformance[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyAccuracy[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

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
      const [progressRes, aptitudeRes, techRes, mockRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id).order('attempted_at', { ascending: true }),
        supabase.from('aptitude_questions_public').select('id, category'),
        supabase.from('technical_mcq_questions_public').select('id, category'),
        supabase
          .from('mock_test_results')
          .select('score, total_questions, percentage, passed, completed_at, time_taken_seconds, mock_tests (name)')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false }),
      ]);

      const progressData = progressRes.data || [];
      const aptitudeQuestions = aptitudeRes.data || [];
      const techQuestions = techRes.data || [];
      const mockResults = mockRes.data || [];

      // Overall stats
      const totalQuestions = progressData.length;
      const correctAnswers = progressData.filter((p) => p.is_correct).length;
      const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      const mockTestsTaken = mockResults.length;
      const mockTestsPassed = mockResults.filter((m) => m.passed).length;
      const uniqueDates = new Set(progressData.map((p) => new Date(p.attempted_at).toDateString()));

      setOverallStats({
        totalQuestions,
        correctAnswers,
        overallAccuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        totalTimeSpent,
        mockTestsTaken,
        mockTestsPassed,
        streakDays: uniqueDates.size,
      });

      // Daily accuracy trend (last 14 days)
      const last14Days: DailyAccuracy[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();
        const dayData = progressData.filter((p) => new Date(p.attempted_at).toDateString() === dateStr);
        if (dayData.length > 0) {
          const acc = Math.round((dayData.filter((p) => p.is_correct).length / dayData.length) * 100);
          last14Days.push({
            date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            accuracy: acc,
            questions: dayData.length,
          });
        }
      }
      setDailyTrend(last14Days);

      // Category performance
      const categoryMap = new Map<string, { total: number; correct: number; type: 'aptitude' | 'technical' | 'mock' }>();
      progressData.forEach((p) => {
        let category = 'General';
        let type: 'aptitude' | 'technical' | 'mock' = 'aptitude';
        if (p.question_type === 'aptitude') {
          const q = aptitudeQuestions.find((aq) => aq.id === p.question_id);
          category = q?.category || 'Aptitude - General';
          type = 'aptitude';
        } else if (p.question_type === 'technical_mcq' || p.question_type === 'technical') {
          const q = techQuestions.find((tq) => tq.id === p.question_id);
          category = q?.category || 'Technical - General';
          type = 'technical';
        } else if (p.question_type === 'mock_test') {
          category = 'Mock Test Questions';
          type = 'mock';
        }
        const current = categoryMap.get(category) || { total: 0, correct: 0, type };
        categoryMap.set(category, { total: current.total + 1, correct: current.correct + (p.is_correct ? 1 : 0), type });
      });

      const performanceArray: CategoryPerformance[] = Array.from(categoryMap.entries())
        .map(([cat, data]) => ({
          category: cat,
          total: data.total,
          correct: data.correct,
          percentage: Math.round((data.correct / data.total) * 100),
          type: data.type,
        }))
        .sort((a, b) => b.total - a.total);

      setCategoryPerformance(performanceArray);

      const validAreas = performanceArray.filter((p) => p.total >= 3);
      const weak = validAreas.filter((p) => p.percentage < 60).sort((a, b) => a.percentage - b.percentage);
      const strong = validAreas.filter((p) => p.percentage >= 80).sort((a, b) => b.percentage - a.percentage);
      setWeakAreas(weak);
      setStrongAreas(strong);

      // Generate smart recommendations
      const recs: Recommendation[] = [];

      if (weak.length > 0) {
        recs.push({
          title: `Improve "${weak[0].category}"`,
          description: `You're at ${weak[0].percentage}% accuracy. Focus here to get the biggest boost.`,
          action: `Practice ${weak[0].type === 'aptitude' ? 'Aptitude' : 'Technical'} MCQs`,
          path: weak[0].type === 'aptitude' ? '/aptitude' : '/technical',
          priority: 'high',
          icon: <TrendingUp className="w-5 h-5" />,
        });
      }

      if (totalQuestions < 20) {
        recs.push({
          title: 'Build Your Foundation',
          description: `You've solved ${totalQuestions} questions. Aim for 50+ to get reliable insights.`,
          action: 'Start Aptitude Practice',
          path: '/aptitude',
          priority: 'high',
          icon: <Brain className="w-5 h-5" />,
        });
      }

      if (mockTestsTaken === 0) {
        recs.push({
          title: 'Take Your First Mock Test',
          description: 'Simulated exam conditions reveal performance gaps not visible in regular practice.',
          action: 'Go to Mock Tests',
          path: '/mock-tests',
          priority: 'medium',
          icon: <Target className="w-5 h-5" />,
        });
      } else if (mockTestsPassed < mockTestsTaken) {
        recs.push({
          title: 'Retake Failed Mock Tests',
          description: `You've failed ${mockTestsTaken - mockTestsPassed} mock test(s). Practice weak areas first, then retry.`,
          action: 'View Mock Tests',
          path: '/mock-tests',
          priority: 'medium',
          icon: <Zap className="w-5 h-5" />,
        });
      }

      if (weak.some((w) => w.type === 'aptitude')) {
        recs.push({
          title: 'Review Aptitude Shortcuts',
          description: 'Cheat codes & formulas help solve aptitude questions 2-3x faster with higher accuracy.',
          action: 'Open Cheat Codes',
          path: '/cheat-codes',
          priority: 'low',
          icon: <BookOpen className="w-5 h-5" />,
        });
      }

      if (overallStats.overallAccuracy > 0 && overallStats.overallAccuracy < 70 && weak.length > 1) {
        recs.push({
          title: 'Daily Practice Goal',
          description: 'Consistency beats intensity. Aim for 10 questions per day to see steady improvement.',
          action: 'Practice Aptitude',
          path: '/aptitude',
          priority: 'low',
          icon: <Flame className="w-5 h-5" />,
        });
      }

      setRecommendations(recs.slice(0, 4));

      // Mock test history
      const mockPerf: MockTestResult[] = mockResults.map((r: any) => ({
        testName: r.mock_tests?.name || 'Mock Test',
        score: r.score,
        total: r.total_questions,
        percentage: r.percentage,
        passed: r.passed,
        completedAt: r.completed_at,
        timeTaken: r.time_taken_seconds || 0,
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

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeColor = (type: 'aptitude' | 'technical' | 'mock') => {
    switch (type) {
      case 'aptitude': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'technical': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'mock': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-red-500/30 bg-red-500/5';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'low': return 'border-primary/30 bg-primary/5';
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-500/20 text-red-600 border-0 text-xs">High Priority</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-600 border-0 text-xs">Medium</Badge>;
      case 'low': return <Badge className="bg-primary/20 text-primary border-0 text-xs">Tip</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Bar chart data for category performance (top 8)
  const barChartData = categoryPerformance.slice(0, 8).map((c) => ({
    name: c.category.length > 16 ? c.category.slice(0, 14) + '…' : c.category,
    accuracy: c.percentage,
    questions: c.total,
  }));

  const barColors = barChartData.map((d) =>
    d.accuracy >= 80 ? '#22c55e' : d.accuracy >= 60 ? '#eab308' : '#ef4444'
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12">
          <CardContent>
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Login Required</h3>
            <p className="text-muted-foreground mb-6">Please login to view your performance report</p>
            <Button onClick={() => navigate('/auth')} size="lg">Login to Continue</Button>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Smart Analytics
            </h1>
            <p className="text-sm text-muted-foreground">Weak area detection & personalized recommendations</p>
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

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.totalQuestions}</p>
                      <p className="text-sm text-muted-foreground">Questions Solved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <Target className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.totalQuestions > 0 ? `${overallStats.overallAccuracy}%` : '--%'}</p>
                      <p className="text-sm text-muted-foreground">Overall Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{formatTime(overallStats.totalTimeSpent)}</p>
                      <p className="text-sm text-muted-foreground">Time Practiced</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/10">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overallStats.streakDays}</p>
                      <p className="text-sm text-muted-foreground">Active Days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personalized Recommendations */}
            {recommendations.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <Lightbulb className="w-5 h-5" />
                    Personalized Practice Recommendations
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Based on your performance patterns</p>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${getPriorityColor(rec.priority)} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                            {rec.icon}
                            {rec.title}
                          </div>
                          {getPriorityBadge(rec.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{rec.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs w-full"
                          onClick={() => navigate(rec.path)}
                        >
                          {rec.action}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accuracy Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Accuracy Trend (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrend.length < 2 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Practice on multiple days to see your trend</p>
                    <p className="text-sm mt-1">Data appears after 2+ days of activity</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: string) => [`${value}%`, 'Accuracy']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Accuracy Bar Chart */}
            {barChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Accuracy by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        angle={-30}
                        textAnchor="end"
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`${value}%`, 'Accuracy']}
                      />
                      <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                        {barChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={barColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Excellent (≥80%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block" />Good (60-79%)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Needs Work (&lt;60%)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weak Areas */}
            {weakAreas.length > 0 && (
              <Card className="bg-red-500/5 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                    <TrendingDown className="w-5 h-5" />
                    Weak Areas — Focus Here ({weakAreas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Categories with &lt;60% accuracy (minimum 3 attempts):
                  </p>
                  <div className="space-y-3">
                    {weakAreas.slice(0, 6).map((area, idx) => (
                      <div key={idx} className="p-3 bg-background rounded-lg border border-red-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-sm font-medium">{area.category}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(area.type)}`}>{area.type}</span>
                          </div>
                          <span className="text-sm font-bold text-red-500">
                            {area.correct}/{area.total} ({area.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${area.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strong Areas */}
            {strongAreas.length > 0 && (
              <Card className="bg-green-500/5 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                    <Star className="w-5 h-5" />
                    Strong Areas — Keep It Up ({strongAreas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {strongAreas.slice(0, 6).map((area, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-green-500/20">
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

            {/* Detailed Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Full Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryPerformance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Practice Data Yet</h3>
                    <p className="mb-6">Start practicing to see your category-wise performance!</p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => navigate('/aptitude')} variant="outline">Practice Aptitude</Button>
                      <Button onClick={() => navigate('/technical')}>Practice Technical</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryPerformance.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {getPerformanceIcon(item.percentage)}
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{item.category}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>{item.type}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 ml-2">
                            <span className="text-sm text-muted-foreground hidden sm:block">
                              {item.correct}/{item.total} correct
                            </span>
                            <span className={`font-bold text-lg ${getPerformanceColor(item.percentage)}`}>
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(item.percentage)} transition-all duration-700`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <Button onClick={() => navigate('/mock-tests')}>Start Mock Test</Button>
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
                                  {new Date(test.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                              <div className="text-xs text-muted-foreground">{test.score}/{test.total} marks</div>
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

          </div>
        )}
      </main>
    </div>
  );
};

export default PerformanceReport;
