import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageSquare, Loader2, Play } from 'lucide-react';

interface GDTopic {
  id: string;
  title: string;
  category: string;
  description: string;
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

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gd_topics')
        .select('id, title, category, description, youtube_url')
        .order('title', { ascending: true });

      if (!error && data) {
        setTopics(
          data.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            description: t.description,
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
        <div className="max-w-4xl mx-auto mb-8">
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

        <div className="max-w-4xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No topics found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((topic) => {
                const videoId = topic.youtubeUrl ? getYoutubeId(topic.youtubeUrl) : null;

                return (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/group-discussion/${topic.id}`)}
                    className="bg-card rounded-xl border border-border overflow-hidden text-left hover:border-primary/40 hover:shadow-lg transition-all group"
                  >
                    {videoId ? (
                      <div className="aspect-video bg-muted relative">
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                          alt={topic.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Play className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="p-4">
                      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mb-2">
                        {topic.category}
                      </span>
                      <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {topic.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GroupDiscussion;
