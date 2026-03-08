import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAchievements } from '@/hooks/useUserAchievements';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Clock, Sparkles, Flame, Award, ChevronRight, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, achievements, unlockedCount, totalAchievements, loading } = useUserAchievements();

  const quickStats = [
    { icon: Trophy, label: 'Questions Solved', value: stats.questionsSolved.toString(), color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Target, label: 'Accuracy Rate', value: stats.questionsSolved > 0 ? `${stats.accuracyRate}%` : '--%', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Clock, label: 'Time Spent', value: `${stats.timeSpentHours}h`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Flame, label: 'Day Streak', value: stats.currentStreak.toString(), color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const recentAchievements = achievements.slice(0, 6);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <section className="relative py-8 md:py-12 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-transparent to-accent/30 border border-border/50">
        <div className="absolute top-8 left-8 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-8 w-72 h-72 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 animate-slide-up">
            Ready to ace your
            <span className="text-primary block mt-1">next interview?</span>
          </h1>

          <p className="text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Pick a practice area from the sidebar to get started.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-300 animate-scale-in"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Streak Banner */}
      {stats.currentStreak > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-fade-in">
          <Flame className="w-6 h-6 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {stats.currentStreak}-day streak! 🔥
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.currentStreak >= 7
                ? "You're on fire! Keep this legendary streak going."
                : "Keep practicing daily to build your streak."}
            </p>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Best: {stats.longestStreak}d
            </span>
          )}
        </div>
      )}

      {/* Achievements */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Achievements</h2>
            <span className="text-xs text-muted-foreground ml-1">
              {unlockedCount}/{totalAchievements}
            </span>
          </div>
          <button
            onClick={() => navigate('/performance')}
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {recentAchievements.map((ach, idx) => (
            <div
              key={ach.id}
              className={`relative rounded-xl border p-4 transition-all duration-300 animate-scale-in ${
                ach.unlocked
                  ? 'bg-card border-primary/20 shadow-sm'
                  : 'bg-muted/30 border-border/50 opacity-70'
              }`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`text-2xl ${ach.unlocked ? '' : 'grayscale opacity-50'}`}>
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold truncate ${ach.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {ach.title}
                    </p>
                    {!ach.unlocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ach.description}</p>
                  {!ach.unlocked && (
                    <div className="mt-2">
                      <Progress value={ach.progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {ach.current}/{ach.threshold}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {ach.unlocked && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-[10px]">✓</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
