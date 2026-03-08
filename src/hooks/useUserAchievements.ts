import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0-100
  threshold: number;
  current: number;
}

export interface UserStats {
  questionsSolved: number;
  accuracyRate: number;
  timeSpentHours: number;
  currentStreak: number;
  longestStreak: number;
  categoriesAttempted: string[];
  mockTestsPassed: number;
}

function calculateStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const uniqueDays = [...new Set(dates.map(d => d.split('T')[0]))].sort().reverse();
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let current = 0;
  if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
    current = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  const sorted = [...uniqueDays].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

export function useUserAchievements() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    questionsSolved: 0,
    accuracyRate: 0,
    timeSpentHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    categoriesAttempted: [],
    mockTestsPassed: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [progressRes, mockRes] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', user.id),
      supabase.from('mock_test_results').select('*').eq('user_id', user.id),
    ]);

    const progress = progressRes.data || [];
    const mockResults = mockRes.data || [];

    const totalQ = progress.length;
    const correct = progress.filter(p => p.is_correct).length;
    const totalTime = progress.reduce((s, p) => s + (p.time_spent_seconds || 0), 0);
    const categories = [...new Set(progress.map(p => p.question_type))];
    const dates = progress.map(p => p.attempted_at);
    const { current, longest } = calculateStreak(dates);
    const passed = mockResults.filter(r => r.passed).length;

    const newStats: UserStats = {
      questionsSolved: totalQ,
      accuracyRate: totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0,
      timeSpentHours: Math.round(totalTime / 3600),
      currentStreak: current,
      longestStreak: longest,
      categoriesAttempted: categories,
      mockTestsPassed: passed,
    };
    setStats(newStats);

    const achList: Achievement[] = [
      {
        id: 'first-step',
        title: 'First Step',
        description: 'Solve your first question',
        icon: '🎯',
        threshold: 1,
        current: newStats.questionsSolved,
        unlocked: newStats.questionsSolved >= 1,
        progress: Math.min(100, (newStats.questionsSolved / 1) * 100),
      },
      {
        id: 'ten-solver',
        title: 'Getting Warmed Up',
        description: 'Solve 10 questions',
        icon: '🔥',
        threshold: 10,
        current: newStats.questionsSolved,
        unlocked: newStats.questionsSolved >= 10,
        progress: Math.min(100, (newStats.questionsSolved / 10) * 100),
      },
      {
        id: 'fifty-solver',
        title: 'Half Century',
        description: 'Solve 50 questions',
        icon: '⭐',
        threshold: 50,
        current: newStats.questionsSolved,
        unlocked: newStats.questionsSolved >= 50,
        progress: Math.min(100, (newStats.questionsSolved / 50) * 100),
      },
      {
        id: 'century',
        title: 'Century Club',
        description: 'Solve 100 questions',
        icon: '💯',
        threshold: 100,
        current: newStats.questionsSolved,
        unlocked: newStats.questionsSolved >= 100,
        progress: Math.min(100, (newStats.questionsSolved / 100) * 100),
      },
      {
        id: 'sharp-shooter',
        title: 'Sharpshooter',
        description: 'Achieve 80%+ accuracy',
        icon: '🎯',
        threshold: 80,
        current: newStats.accuracyRate,
        unlocked: newStats.accuracyRate >= 80 && newStats.questionsSolved >= 5,
        progress: Math.min(100, (newStats.accuracyRate / 80) * 100),
      },
      {
        id: 'streak-3',
        title: '3-Day Streak',
        description: 'Practice 3 days in a row',
        icon: '🔥',
        threshold: 3,
        current: newStats.longestStreak,
        unlocked: newStats.longestStreak >= 3,
        progress: Math.min(100, (newStats.longestStreak / 3) * 100),
      },
      {
        id: 'streak-7',
        title: 'Week Warrior',
        description: 'Practice 7 days in a row',
        icon: '⚡',
        threshold: 7,
        current: newStats.longestStreak,
        unlocked: newStats.longestStreak >= 7,
        progress: Math.min(100, (newStats.longestStreak / 7) * 100),
      },
      {
        id: 'all-rounder',
        title: 'All-Rounder',
        description: 'Attempt all practice categories',
        icon: '🌟',
        threshold: 4,
        current: newStats.categoriesAttempted.length,
        unlocked: newStats.categoriesAttempted.length >= 4,
        progress: Math.min(100, (newStats.categoriesAttempted.length / 4) * 100),
      },
      {
        id: 'mock-master',
        title: 'Mock Master',
        description: 'Pass a mock test',
        icon: '🏆',
        threshold: 1,
        current: newStats.mockTestsPassed,
        unlocked: newStats.mockTestsPassed >= 1,
        progress: Math.min(100, (newStats.mockTestsPassed / 1) * 100),
      },
    ];

    setAchievements(achList);
    setLoading(false);
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;

  return { stats, achievements, unlockedCount, totalAchievements, loading };
}
