import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    questionsSolved: 0,
    accuracyRate: 0,
    timeSpent: 0
  });

  useEffect(() => {
    if (user) fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    const { data, error } = await supabase.
    from('user_progress').
    select('is_correct, time_spent_seconds').
    eq('user_id', user.id);

    if (error) {console.error('Error fetching stats:', error);return;}

    if (data && data.length > 0) {
      const totalQuestions = data.length;
      const correctAnswers = data.filter((p) => p.is_correct).length;
      const totalTime = data.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      setStats({
        questionsSolved: totalQuestions,
        accuracyRate: Math.round(correctAnswers / totalQuestions * 100),
        timeSpent: Math.round(totalTime / 3600)
      });
    }
  };

  const quickStats = [
  { icon: Trophy, label: 'Questions Solved', value: stats.questionsSolved.toString() },
  { icon: Target, label: 'Accuracy Rate', value: stats.questionsSolved > 0 ? `${stats.accuracyRate}%` : '--%' }];



  return (
    <div className="p-6 md:p-10">
      {/* Hero */}
      <section className="relative py-10 md:py-16 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 mb-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary/10 text-primary text-lg font-semibold mb-6 animate-fade-in">
            
            Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 animate-slide-up">
            Ready to ace your
            <span className="text-gradient block mt-1">next interview?</span>
          </h1>

          <p className="text-lg text-muted-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Pick a practice area from the sidebar to get started.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {quickStats.map((stat, idx) =>
        <div
          key={idx}
          className="bg-card rounded-2xl p-5 text-center shadow-card border border-border animate-scale-in"
          style={{ animationDelay: `${idx * 0.1}s` }}>
          
            <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        )}
      </div>
    </div>);

};

export default Dashboard;