import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Brain, Code, MessageSquare, Play, Trophy, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MockTestConfig {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  questions: {
    aptitude: number;
    technical: number;
    gd: number;
  };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  icon: typeof Brain;
}

const mockTests: MockTestConfig[] = [
  {
    id: 'quick-practice',
    title: 'Quick Practice',
    description: 'A short test to warm up your skills with a mix of questions.',
    duration: 15,
    questions: { aptitude: 5, technical: 3, gd: 2 },
    difficulty: 'Easy',
    icon: Zap,
  },
  {
    id: 'standard-test',
    title: 'Standard Mock Test',
    description: 'A balanced test covering all areas with moderate difficulty.',
    duration: 30,
    questions: { aptitude: 10, technical: 5, gd: 5 },
    difficulty: 'Medium',
    icon: Target,
  },
  {
    id: 'full-simulation',
    title: 'Full Interview Simulation',
    description: 'Complete interview simulation with challenging questions.',
    duration: 60,
    questions: { aptitude: 20, technical: 10, gd: 10 },
    difficulty: 'Hard',
    icon: Trophy,
  },
];

const MockTests: React.FC = () => {
  const navigate = useNavigate();

  const handleStartTest = (testId: string) => {
    const test = mockTests.find(t => t.id === testId);
    if (test) {
      navigate(`/mock-test/${testId}`, { 
        state: { 
          config: test 
        } 
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-success bg-success/10 border-success/20';
      case 'Medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'Hard': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mock Tests</h1>
              <p className="text-sm text-muted-foreground">Simulate real interview conditions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Info Section */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 mb-8 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Timed Practice Sessions</h2>
              <p className="text-muted-foreground text-sm">
                Each mock test simulates real interview conditions with a countdown timer. 
                Questions are randomly selected from Aptitude, Technical, and Group Discussion categories.
                Complete all questions before time runs out!
              </p>
            </div>
          </div>
        </div>

        {/* Mock Test Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {mockTests.map((test) => (
            <Card key={test.id} className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center`}>
                    <test.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getDifficultyColor(test.difficulty)}`}>
                    {test.difficulty}
                  </span>
                </div>
                <CardTitle className="text-xl">{test.title}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Duration */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">{test.duration} minutes</span>
                </div>

                {/* Question Breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Questions</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <Brain className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{test.questions.aptitude}</span>
                      <p className="text-xs text-muted-foreground">Aptitude</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <Code className="w-4 h-4 mx-auto mb-1 text-accent" />
                      <span className="text-sm font-semibold text-foreground">{test.questions.technical}</span>
                      <p className="text-xs text-muted-foreground">Technical</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <MessageSquare className="w-4 h-4 mx-auto mb-1 text-secondary" />
                      <span className="text-sm font-semibold text-foreground">{test.questions.gd}</span>
                      <p className="text-xs text-muted-foreground">GD</p>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <Button 
                  className="w-full group-hover:bg-primary"
                  onClick={() => handleStartTest(test.id)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Test
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-12 bg-card rounded-2xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Tips for Mock Tests</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-muted-foreground text-sm">Find a quiet environment without distractions before starting</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-muted-foreground text-sm">Manage your time wisely - don't spend too long on one question</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-muted-foreground text-sm">Review your answers if you finish early</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-muted-foreground text-sm">Treat it like a real interview for the best practice experience</p>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default MockTests;
