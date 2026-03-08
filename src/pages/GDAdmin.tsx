import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Upload,
  Loader2,
  MessageSquare,
  CheckSquare,
  Square,
} from 'lucide-react';

interface GDTopicRow {
  id: string;
  title: string;
  category: string;
  description: string;
  youtube_url: string | null;
  created_at: string;
}

const CATEGORIES = ['Technology', 'Business', 'Social', 'Finance'];

const GDAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topics, setTopics] = useState<GDTopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', category: 'Technology', description: '', youtubeUrl: '' });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', description: '', youtubeUrl: '' });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gd_topics')
      .select('id, title, category, description, youtube_url, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) setTopics(data);
    setLoading(false);
  };

  useEffect(() => { fetchTopics(); }, []);

  // Add topic
  const handleAdd = async () => {
    if (!addForm.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('gd_topics').insert({
      title: addForm.title.trim(),
      category: addForm.category,
      description: addForm.description.trim(),
      youtube_url: addForm.youtubeUrl.trim() || null,
      points_for: [],
      points_against: [],
      tips: [],
      conclusion: '',
      created_by: user?.id,
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Topic added!' });
      setAddForm({ title: '', category: 'Technology', description: '', youtubeUrl: '' });
      setShowAddForm(false);
      fetchTopics();
    }
  };

  // Edit topic
  const startEdit = (topic: GDTopicRow) => {
    setEditingId(topic.id);
    setEditForm({
      title: topic.title,
      category: topic.category,
      description: topic.description,
      youtubeUrl: topic.youtube_url || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('gd_topics')
      .update({
        title: editForm.title.trim(),
        category: editForm.category,
        description: editForm.description.trim(),
        youtube_url: editForm.youtubeUrl.trim() || null,
      })
      .eq('id', editingId);
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Topic updated!' });
      setEditingId(null);
      fetchTopics();
    }
  };

  // Delete single
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    const { error } = await supabase.from('gd_topics').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Topic removed.' });
      fetchTopics();
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} topics?`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('gd_topics').delete().in('id', Array.from(selectedIds));
    setBulkDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: `${selectedIds.size} topics removed.` });
      setSelectedIds(new Set());
      fetchTopics();
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === topics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(topics.map((t) => t.id)));
    }
  };

  // CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: 'Error', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
      return;
    }

    // Expected CSV: title,category,description,youtube_url
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        title: cols[0] || '',
        category: CATEGORIES.includes(cols[1]) ? cols[1] : 'Technology',
        description: cols[2] || '',
        youtube_url: cols[3] || null,
        points_for: [],
        points_against: [],
        tips: [],
        conclusion: '',
        created_by: user?.id,
      };
    }).filter((r) => r.title);

    if (rows.length === 0) {
      toast({ title: 'Error', description: 'No valid rows found.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('gd_topics').insert(rows);
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${rows.length} topics imported!` });
      fetchTopics();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Admin</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">GD Topics Admin</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Topic
          </Button>

          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />

          {selectedIds.size > 0 && (
            <Button variant="destructive" className="gap-2" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete ({selectedIds.size})
            </Button>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {topics.length} topics total
          </span>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Add New Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={addForm.title}
                    onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Topic title"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={addForm.category} onValueChange={(v) => setAddForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the topic"
                  rows={2}
                />
              </div>
              <div>
                <Label>YouTube URL</Label>
                <Input
                  value={addForm.youtubeUrl}
                  onChange={(e) => setAddForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CSV Format Help */}
        <div className="text-xs text-muted-foreground mb-4 bg-muted/50 rounded-lg p-3">
          <strong>CSV format:</strong> title, category, description, youtube_url<br />
          Categories: Technology, Business, Social, Finance
        </div>

        {/* Topics Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : topics.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No topics yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {/* Select all */}
            <div className="flex items-center gap-3 px-2 py-1">
              <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                {selectedIds.size === topics.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>

            {topics.map((topic) => (
              <div
                key={topic.id}
                className={`bg-card border rounded-lg p-4 transition-colors ${
                  selectedIds.has(topic.id) ? 'border-primary/40' : 'border-border'
                }`}
              >
                {editingId === topic.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                      />
                      <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                      rows={2}
                    />
                    <Input
                      value={editForm.youtubeUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                      placeholder="YouTube URL"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleSelect(topic.id)} className="mt-1 text-muted-foreground hover:text-foreground">
                      {selectedIds.has(topic.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {topic.category}
                        </span>
                        {topic.youtube_url && (
                          <span className="text-xs text-muted-foreground">🎥 Video</span>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground text-sm">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topic.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(topic)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(topic.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GDAdmin;
