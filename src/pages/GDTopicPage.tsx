import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Play, ExternalLink } from 'lucide-react';

interface GDTopicDetail {
  id: string;
  title: string;
  category: string;
  description: string;
  youtubeUrl: string | null;
}

const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

const GDTopicPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<GDTopicDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopic = async () => {
      if (!topicId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('gd_topics')
        .select('id, title, category, description, youtube_url')
        .eq('id', topicId)
        .maybeSingle();

      if (!error && data) {
        setTopic({
          id: data.id,
          title: data.title,
          category: data.category,
          description: data.description,
          youtubeUrl: data.youtube_url || null,
        });
      }
      setLoading(false);
    };
    fetchTopic();
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Topic not found.</p>
        <button
          onClick={() => navigate('/group-discussion')}
          className="text-primary hover:underline text-sm"
        >
          ← Back to topics
        </button>
      </div>
    );
  }

  const videoId = topic.youtubeUrl ? getYoutubeId(topic.youtubeUrl) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/group-discussion')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex-1 min-w-0">
            <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {topic.category}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate mt-0.5">
              {topic.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* YouTube Video */}
          {videoId ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-muted">
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
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Watch on YouTube
            </a>
          ) : (
            <div className="rounded-xl aspect-video bg-muted flex items-center justify-center">
              <Play className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Description */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-semibold text-foreground mb-2">About this topic</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {topic.description}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GDTopicPage;
