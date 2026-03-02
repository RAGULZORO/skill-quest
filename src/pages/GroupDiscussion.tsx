import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Shuffle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Star,
  ExternalLink,
  BookOpen,
  Loader2,
  X,
  Play,
} from 'lucide-react';

interface GDTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  pointsFor: string[];
  pointsAgainst: string[];
  tips: string[];
  conclusion: string;
  level: number;
  youtubeUrl: string | null;
}

interface UserNote {
  notes: string;
  confidence_level: number | null;
}

const CATEGORIES = ['All', 'Technology', 'Business', 'Social', 'Finance'];

const GroupDiscussion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topics, setTopics] = useState<GDTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [trackedTopics, setTrackedTopics] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState<Record<string, UserNote>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [markingStudied, setMarkingStudied] = useState(false);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch topics
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gd_topics')
        .select('*')
        .order('title', { ascending: true });

      if (!error && data) {
        setTopics(
          data.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            description: t.description,
            pointsFor: t.points_for as string[],
            pointsAgainst: t.points_against as string[],
            tips: t.tips as string[],
            conclusion: t.conclusion,
            level: t.level || 1,
            youtubeUrl: t.youtube_url || null,
          }))
        );
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Fetch user progress + notes
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      const [progressRes, notesRes] = await Promise.all([
        supabase
          .from('user_progress')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('question_type', 'gd'),
        supabase
          .from('gd_user_notes')
          .select('topic_id, notes, confidence_level')
          .eq('user_id', user.id),
      ]);

      if (progressRes.data) {
        setTrackedTopics(new Set(progressRes.data.map((p) => p.question_id)));
      }
      if (notesRes.data) {
        const map: Record<string, UserNote> = {};
        notesRes.data.forEach((n: any) => {
          map[n.topic_id] = { notes: n.notes, confidence_level: n.confidence_level };
        });
        setUserNotes(map);
      }
    };
    fetchUserData();
  }, [user]);

  // Filter topics
  const filtered = topics.filter((t) => {
    const matchCategory = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const selectedTopic = topics.find((t) => t.id === selectedTopicId) || null;

  // Surprise Me
  const handleSurprise = () => {
    if (filtered.length === 0) return;
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setHighlightedId(random.id);
    cardRefs.current[random.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 2000);
  };

  // YouTube helpers
  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] || null;
  };

  // Save notes (debounced)
  const saveNotes = useCallback(
    (topicId: string, notes: string) => {
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const existing = userNotes[topicId];
        await supabase.from('gd_user_notes').upsert(
          {
            user_id: user.id,
            topic_id: topicId,
            notes,
            confidence_level: existing?.confidence_level ?? null,
          },
          { onConflict: 'user_id,topic_id' }
        );
      }, 500);
    },
    [user, userNotes]
  );

  // Save confidence
  const saveConfidence = async (topicId: string, level: number) => {
    if (!user) return;
    const existing = userNotes[topicId];
    setUserNotes((prev) => ({
      ...prev,
      [topicId]: { notes: existing?.notes || '', confidence_level: level },
    }));
    await supabase.from('gd_user_notes').upsert(
      {
        user_id: user.id,
        topic_id: topicId,
        notes: existing?.notes || '',
        confidence_level: level,
      },
      { onConflict: 'user_id,topic_id' }
    );
  };

  // Mark as studied
  const markAsStudied = async (topicId: string) => {
    if (!user || trackedTopics.has(topicId)) return;
    setMarkingStudied(true);
    await supabase.from('user_progress').insert({
      user_id: user.id,
      question_id: topicId,
      question_type: 'gd',
      is_correct: true,
      time_spent_seconds: 0,
    });
    setTrackedTopics((prev) => new Set(prev).add(topicId));
    setMarkingStudied(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">GD Prep</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleSurprise} className="gap-2">
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Surprise Me</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filter Bar */}
        <div className="max-w-5xl mx-auto mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Topics Grid + Detail */}
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* Cards */}
          <div className={`grid gap-4 ${selectedTopic ? 'lg:w-1/2' : 'w-full'} grid-cols-1 ${!selectedTopic ? 'sm:grid-cols-2' : ''}`}>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-12">No topics found.</p>
            ) : (
              filtered.map((topic) => {
                const confidence = userNotes[topic.id]?.confidence_level;
                const studied = trackedTopics.has(topic.id);
                const videoId = topic.youtubeUrl ? getYoutubeId(topic.youtubeUrl) : null;

                return (
                  <div
                    key={topic.id}
                    ref={(el) => { cardRefs.current[topic.id] = el; }}
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`bg-card rounded-2xl p-5 border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                      selectedTopicId === topic.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border'
                    } ${highlightedId === topic.id ? 'ring-2 ring-primary animate-pulse-glow' : ''}`}
                  >
                    {/* Badge row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {topic.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {studied && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        {confidence && (
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= confidence ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground mb-1">{topic.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>

                    {videoId && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                        <Play className="w-3.5 h-3.5" />
                        <span>Video available</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          {selectedTopic && (
            <div className="lg:w-1/2 lg:sticky lg:top-24 lg:self-start bg-card rounded-2xl border border-border p-6 animate-fade-in max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{selectedTopic.title}</h2>
                <button onClick={() => setSelectedTopicId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-muted-foreground text-sm mb-5">{selectedTopic.description}</p>

              {/* YouTube */}
              {selectedTopic.youtubeUrl && (() => {
                const vid = getYoutubeId(selectedTopic.youtubeUrl!);
                return vid ? (
                  <div className="mb-5 rounded-xl overflow-hidden aspect-video bg-muted">
                    <iframe
                      src={`https://www.youtube.com/embed/${vid}`}
                      title={selectedTopic.title}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : (
                  <a
                    href={selectedTopic.youtubeUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-5"
                  >
                    <ExternalLink className="w-4 h-4" /> Watch on YouTube
                  </a>
                );
              })()}

              {/* Points For */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-foreground">Points in Favor</h4>
                </div>
                <ul className="space-y-1.5">
                  {selectedTopic.pointsFor.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Points Against */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsDown className="w-5 h-5 text-destructive" />
                  <h4 className="font-medium text-foreground">Points Against</h4>
                </div>
                <ul className="space-y-1.5">
                  {selectedTopic.pointsAgainst.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-foreground">Discussion Tips</h4>
                </div>
                <ul className="space-y-1.5">
                  {selectedTopic.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0">
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conclusion */}
              <div className="bg-primary/5 rounded-xl p-4 mb-5">
                <h4 className="font-medium text-foreground mb-1">Model Conclusion</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedTopic.conclusion}</p>
              </div>

              {/* Confidence Stars */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Your Confidence</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => saveConfidence(selectedTopic.id, s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= (userNotes[selectedTopic.id]?.confidence_level || 0)
                            ? 'text-primary fill-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <h4 className="text-sm font-medium text-foreground mb-2">My Notes</h4>
                <Textarea
                  placeholder="Add your personal notes..."
                  value={userNotes[selectedTopic.id]?.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserNotes((prev) => ({
                      ...prev,
                      [selectedTopic.id]: {
                        notes: val,
                        confidence_level: prev[selectedTopic.id]?.confidence_level ?? null,
                      },
                    }));
                    saveNotes(selectedTopic.id, val);
                  }}
                  rows={3}
                />
              </div>

              {/* Mark as Studied */}
              <Button
                onClick={() => markAsStudied(selectedTopic.id)}
                disabled={trackedTopics.has(selectedTopic.id) || markingStudied}
                className="w-full gap-2"
              >
                {trackedTopics.has(selectedTopic.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Studied
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" /> Mark as Studied
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* General GD Tips */}
        <div className="max-w-5xl mx-auto mt-12">
          <div className="bg-primary rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-primary-foreground mb-4">General GD Tips</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Start with a clear introduction of the topic',
                "Listen actively and acknowledge others' points",
                'Use facts and examples to support your arguments',
                'Maintain a calm and respectful tone',
                'Summarize key points when concluding',
                'Avoid interrupting others while they speak',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-primary-foreground/90">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GroupDiscussion;
