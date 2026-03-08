import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  ExternalLink,
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
  youtubeUrl: string | null;
}

const CATEGORIES = ['All', 'Technology', 'Business', 'Social', 'Finance'];

const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

const GroupDiscussion = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<GDTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
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
            youtubeUrl: t.youtube_url || null,
          }))
        );
      }
      setLoading(false);
    };
    fetchTopics();
  }, []);

  const filtered = topics.filter(
    (t) => activeCategory === 'All' || t.category === activeCategory
  );

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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
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
            <span className="text-lg font-bold text-foreground">Group Discussion</span>
          </div>

          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Category Filter */}
        <div className="max-w-3xl mx-auto mb-6">
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

        {/* Topics List */}
        <div className="max-w-3xl mx-auto space-y-3">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No topics found.</p>
          ) : (
            filtered.map((topic) => {
              const isExpanded = expandedId === topic.id;
              const videoId = topic.youtubeUrl ? getYoutubeId(topic.youtubeUrl) : null;

              return (
                <div
                  key={topic.id}
                  className={`bg-card rounded-xl border transition-colors ${
                    isExpanded ? 'border-primary/40' : 'border-border'
                  }`}
                >
                  {/* Topic Header - clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : topic.id)}
                    className="w-full p-5 flex items-start justify-between text-left hover:bg-muted/30 transition-colors rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mb-2">
                        {topic.category}
                      </span>
                      <h3 className="font-semibold text-foreground text-base">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {topic.description}
                      </p>
                      {videoId && !isExpanded && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                          <Play className="w-3.5 h-3.5" />
                          <span>Video available</span>
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground mt-1 ml-4 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border space-y-5">
                      {/* YouTube Video */}
                      {videoId ? (
                        <div className="mt-5 rounded-xl overflow-hidden aspect-video bg-muted">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={topic.title}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      ) : topic.youtubeUrl ? (
                        <a
                          href={topic.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" /> Watch on YouTube
                        </a>
                      ) : null}

                      {/* Points For */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground">Points in Favor</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {topic.pointsFor.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Points Against */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsDown className="w-5 h-5 text-destructive" />
                          <h4 className="font-medium text-foreground">Points Against</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {topic.pointsAgainst.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tips */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-foreground">Discussion Tips</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {topic.tips.map((tip, i) => (
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
                      <div className="bg-primary/5 rounded-xl p-4">
                        <h4 className="font-medium text-foreground mb-1">Model Conclusion</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {topic.conclusion}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default GroupDiscussion;
