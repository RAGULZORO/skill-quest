import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, XCircle, BarChart3, Target,
  TrendingDown, TrendingUp, BookOpen, Lightbulb, Clock, Trophy,
  Calendar, Activity, Brain, Zap, Star, Flame, ChevronRight,
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
    totalQuestions: 0, correctAnswers: 0, overallAccuracy: 0,
    totalTimeSpent: 0, mockTestsTaken: 0, mockTestsPassed: 0, streakDays: 0,
  });
  const [weakAreas, setWeakAreas] = useState<CategoryPerformance[]>([]);
  const [strongAreas, setStrongAreas] = useState<CategoryPerformance[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyAccuracy[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (user) fetchAllPerformanceData();
    else setLoading(false);
  }, [user]);

  const fetchAllPerformanceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [progressRes, aptitudeRes, techRes, mockRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id).order('attempted_at', { ascending: true }),
        supabase.from('aptitude_questions_public').select('id, category'),
        supabase.from('technical_mcq_questions_public').select('id, category'),
        supabase.from('mock_test_results')
          .select('score, total_questions, percentage, passed, completed_at, time_taken_seconds, mock_tests (name)')
          .eq('user_id', user.id).order('completed_at', { ascending: false }),
      ]);

      const progressData = progressRes.data || [];
      const aptitudeQuestions = aptitudeRes.data || [];
      const techQuestions = techRes.data || [];
      const mockResults = mockRes.data || [];

      const totalQuestions = progressData.length;
      const correctAnswers = progressData.filter((p) => p.is_correct).length;
      const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      const mockTestsTaken = mockResults.length;
      const mockTestsPassed = mockResults.filter((m) => m.passed).length;
      const uniqueDates = new Set(progressData.map((p) => new Date(p.attempted_at).toDateString()));

      setOverallStats({
        totalQuestions, correctAnswers,
        overallAccuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        totalTimeSpent, mockTestsTaken, mockTestsPassed, streakDays: uniqueDates.size,
      });

      const last14Days: DailyAccuracy[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();
        const dayData = progressData.filter((p) => new Date(p.attempted_at).toDateString() === dateStr);
        if (dayData.length > 0) {
          last14Days.push({
            date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            accuracy: Math.round((dayData.filter((p) => p.is_correct).length / dayData.length) * 100),
            questions: dayData.length,
          });
        }
      }
      setDailyTrend(last14Days);

      const categoryMap = new Map<string, { total: number; correct: number; type: 'aptitude' | 'technical' | 'mock' }>();
      progressData.forEach((p) => {
        let category = 'General';
        let type: 'aptitude' | 'technical' | 'mock' = 'aptitude';
        if (p.question_type === 'aptitude') {
          category = aptitudeQuestions.find((aq) => aq.id === p.question_id)?.category || 'Aptitude - General';
          type = 'aptitude';
        } else if (p.question_type === 'technical_mcq' || p.question_type === 'technical') {
          category = techQuestions.find((tq) => tq.id === p.question_id)?.category || 'Technical - General';
          type = 'technical';
        } else if (p.question_type === 'mock_test') {
          category = 'Mock Test Questions'; type = 'mock';
        }
        const current = categoryMap.get(category) || { total: 0, correct: 0, type };
        categoryMap.set(category, { total: current.total + 1, correct: current.correct + (p.is_correct ? 1 : 0), type });
      });

      const performanceArray: CategoryPerformance[] = Array.from(categoryMap.entries())
        .map(([cat, data]) => ({
          category: cat, total: data.total, correct: data.correct,
          percentage: Math.round((data.correct / data.total) * 100), type: data.type,
        })).sort((a, b) => b.total - a.total);

      setCategoryPerformance(performanceArray);
      const validAreas = performanceArray.filter((p) => p.total >= 3);
      setWeakAreas(validAreas.filter((p) => p.percentage < 60).sort((a, b) => a.percentage - b.percentage));
      setStrongAreas(validAreas.filter((p) => p.percentage >= 80).sort((a, b) => b.percentage - a.percentage));

      const recs: Recommendation[] = [];
      const weak = validAreas.filter((p) => p.percentage < 60).sort((a, b) => a.percentage - b.percentage);
      if (weak.length > 0) {
        recs.push({
          title: `Improve "${weak[0].category}"`,
          description: `You're at ${weak[0].percentage}% accuracy. Focus here for the biggest boost.`,
          action: `Practice ${weak[0].type === 'aptitude' ? 'Aptitude' : 'Technical'} MCQs`,
          path: weak[0].type === 'aptitude' ? '/aptitude' : '/technical',
          priority: 'high', icon: <TrendingUp className="w-4 h-4" />,
        });
      }
      if (totalQuestions < 20) {
        recs.push({
          title: 'Build Your Foundation',
          description: `${totalQuestions} questions solved. Aim for 50+ for reliable insights.`,
          action: 'Start Aptitude Practice', path: '/aptitude',
          priority: 'high', icon: <Brain className="w-4 h-4" />,
        });
      }
      if (mockTestsTaken === 0) {
        recs.push({
          title: 'Take Your First Mock Test',
          description: 'Simulated exams reveal gaps not visible in regular practice.',
          action: 'Go to Mock Tests', path: '/mock-tests',
          priority: 'medium', icon: <Target className="w-4 h-4" />,
        });
      } else if (mockTestsPassed < mockTestsTaken) {
        recs.push({
          title: 'Retake Failed Mock Tests',
          description: `${mockTestsTaken - mockTestsPassed} failed. Practice weak areas then retry.`,
          action: 'View Mock Tests', path: '/mock-tests',
          priority: 'medium', icon: <Zap className="w-4 h-4" />,
        });
      }
      if (weak.some((w) => w.type === 'aptitude')) {
        recs.push({
          title: 'Review Aptitude Shortcuts',
          description: 'Cheat codes help solve questions 2-3x faster.',
          action: 'Open Cheat Codes', path: '/cheat-codes',
          priority: 'low', icon: <BookOpen className="w-4 h-4" />,
        });
      }
      setRecommendations(recs.slice(0, 4));

      setMockTestResults(mockResults.map((r: any) => ({
        testName: r.mock_tests?.name || 'Mock Test',
        score: r.score, total: r.total_questions, percentage: r.percentage,
        passed: r.passed, completedAt: r.completed_at, timeTaken: r.time_taken_seconds || 0,
      })));
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const barChartData = categoryPerformance.slice(0, 8).map((c) => ({
    name: c.category.length > 14 ? c.category.slice(0, 12) + '…' : c.category,
    accuracy: c.percentage, questions: c.total,
  }));
  const barColors = barChartData.map((d) =>
    d.accuracy >= 80 ? 'hsl(142, 71%, 45%)' : d.accuracy >= 60 ? 'hsl(48, 96%, 53%)' : 'hsl(0, 84%, 60%)'
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-sm w-full text-center py-10">
          <CardContent>
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1.5">Login Required</h3>
            <p className="text-sm text-muted-foreground mb-5">Please login to view your performance report</p>
            <Button onClick={() => navigate('/auth')}>Login to Continue</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analytics & recommendations for {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Analyzing your data…</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Questions Solved', value: overallStats.totalQuestions, icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Overall Accuracy', value: overallStats.totalQuestions > 0 ? `${overallStats.overallAccuracy}%` : '--', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Time Practiced', value: formatTime(overallStats.totalTimeSpent), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Active Days', value: overallStats.streakDays, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            ].map((stat) => (
              <Card key={stat.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-foreground leading-tight">{stat.value}</p>
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {recommendations.map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(rec.path)}
                      className={`text-left p-3.5 rounded-lg border transition-all hover:shadow-sm ${
                        rec.priority === 'high' ? 'border-destructive/20 bg-destructive/5 hover:border-destructive/40'
                        : rec.priority === 'medium' ? 'border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40'
                        : 'border-border/50 bg-muted/30 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${
                          rec.priority === 'high' ? 'text-destructive' : rec.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-primary'
                        }`}>{rec.icon}</span>
                        <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                      <span className="text-xs font-medium text-primary mt-2 inline-flex items-center gap-0.5">
                        {rec.action} <ChevronRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Accuracy Trend */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  14-Day Accuracy Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrend.length < 2 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Practice on 2+ days to see your trend</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value: any) => [`${value}%`, 'Accuracy']}
                      />
                      <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Bar Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Category Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barChartData.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No category data yet</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -25, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-25} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: any) => [`${value}%`, 'Accuracy']}
                        />
                        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                          {barChartData.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />≥80%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500 inline-block" />60-79%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />&lt;60%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Weak & Strong Areas Side by Side */}
          {(weakAreas.length > 0 || strongAreas.length > 0) && (
            <div className="grid lg:grid-cols-2 gap-4">
              {weakAreas.length > 0 && (
                <Card className="border-destructive/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <TrendingDown className="w-4 h-4" />
                      Weak Areas ({weakAreas.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">&lt;60% accuracy, 3+ attempts</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {weakAreas.slice(0, 5).map((area, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-destructive/5 border border-destructive/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                          <span className="text-sm font-medium truncate">{area.category}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{area.correct}/{area.total}</span>
                          <span className="text-sm font-bold text-destructive">{area.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {strongAreas.length > 0 && (
                <Card className="border-emerald-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                      <Star className="w-4 h-4" />
                      Strong Areas ({strongAreas.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">≥80% accuracy, 3+ attempts</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {strongAreas.slice(0, 5).map((area, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-sm font-medium truncate">{area.category}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-500 shrink-0">{area.percentage}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Full Category Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Full Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryPerformance.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium mb-1">No Practice Data Yet</p>
                  <p className="text-xs mb-4">Start practicing to see category performance</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => navigate('/aptitude')}>Aptitude</Button>
                    <Button size="sm" onClick={() => navigate('/technical')}>Technical</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryPerformance.map((item, idx) => {
                    const color = item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                    const textColor = item.percentage >= 80 ? 'text-emerald-500' : item.percentage >= 60 ? 'text-yellow-500' : 'text-red-500';
                    return (
                      <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{item.category}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              item.type === 'aptitude' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : item.type === 'technical' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}>{item.type}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-muted-foreground">{item.correct}/{item.total}</span>
                            <span className={`text-sm font-bold ${textColor}`}>{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mock Test History */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Mock Test History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mockTestResults.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium mb-1">No Mock Tests Taken</p>
                  <p className="text-xs mb-4">Take a mock test to evaluate your preparation</p>
                  <Button size="sm" onClick={() => navigate('/mock-tests')}>Start Mock Test</Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mockTestResults.map((test, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3.5 rounded-lg border ${
                      test.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {test.passed
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          : <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        }
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{test.testName}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{new Date(test.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            {test.timeTaken > 0 && <span>· {formatTime(test.timeTaken)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-lg font-bold ${test.passed ? 'text-emerald-500' : 'text-destructive'}`}>{test.percentage}%</span>
                          <p className="text-[10px] text-muted-foreground">{test.score}/{test.total}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          test.passed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                        }`}>{test.passed ? 'Passed' : 'Failed'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default PerformanceReport;
