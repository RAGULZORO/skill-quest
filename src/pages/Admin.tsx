import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Code, Terminal, Users, Plus, Trash2, Save, AlertCircle, CheckCircle2, TrendingUp, BarChart3, Search, ClipboardList, Clock, Edit, Power, Download, Trophy, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CSVImport } from '@/components/CSVImport';
import { MockTestCSVImport } from '@/components/MockTestCSVImport';

interface MockTest {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string | null;
  total_questions: number;
  time_minutes: number;
  aptitude_questions: number;
  technical_questions: number;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Track question counts for each level
  const [aptitudeQuestionCounts, setAptitudeQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  const [technicalQuestionCounts, setTechnicalQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  const [gdQuestionCounts, setGdQuestionCounts] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0
  });

  // Aptitude form state
  const [aptitudeForm, setAptitudeForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: 'Quantitative',
    level: 1
  });

  // Technical MCQ form state (same structure as aptitude)
  const [technicalForm, setTechnicalForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: 'Programming',
    level: 1
  });

  // GD form state
  const [gdForm, setGdForm] = useState({
    title: '',
    category: 'Technology',
    description: '',
    pointsFor: [''],
    pointsAgainst: [''],
    tips: [''],
    conclusion: '',
    level: 1
  });

  const [saving, setSaving] = useState(false);

  // Questions list state for editing
  const [allAptitudeQuestions, setAllAptitudeQuestions] = useState<any[]>([]);
  const [allTechnicalQuestions, setAllTechnicalQuestions] = useState<any[]>([]);
  const [allGdQuestions, setAllGdQuestions] = useState<any[]>([]);
  const [allCodingQuestions, setAllCodingQuestions] = useState<any[]>([]);
  
  // Edit mode state
  const [editingAptitudeId, setEditingAptitudeId] = useState<string | null>(null);
  const [editingTechnicalId, setEditingTechnicalId] = useState<string | null>(null);
  const [editingGdId, setEditingGdId] = useState<string | null>(null);
  const [editingCodingId, setEditingCodingId] = useState<string | null>(null);
  
  // Edit forms
  const [editAptitudeForm, setEditAptitudeForm] = useState<any>(null);
  const [editTechnicalForm, setEditTechnicalForm] = useState<any>(null);
  const [editGdForm, setEditGdForm] = useState<any>(null);
  const [editCodingForm, setEditCodingForm] = useState<any>(null);
  
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Bulk selection state
  const [selectedAptitudeIds, setSelectedAptitudeIds] = useState<Set<string>>(new Set());
  const [selectedTechnicalIds, setSelectedTechnicalIds] = useState<Set<string>>(new Set());
  const [selectedGdIds, setSelectedGdIds] = useState<Set<string>>(new Set());
  const [selectedCodingIds, setSelectedCodingIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Coding form state
  const [codingForm, setCodingForm] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    category: 'Programming',
    level: 1,
    examples: [{ input: '', output: '' }],
    approach: '',
    solution: ''
  });

  // Coding question counts
  const [codingQuestionCounts, setCodingQuestionCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0
  });

  // User Progress state
  const [userProgressData, setUserProgressData] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progressCategory, setProgressCategory] = useState<'all' | 'aptitude' | 'technical' | 'gd'>('all');

  // Mock Tests state
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [loadingMockTests, setLoadingMockTests] = useState(false);
  const [editingMockTestId, setEditingMockTestId] = useState<string | null>(null);
  const [mockTestForm, setMockTestForm] = useState({
    name: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    description: '',
    total_questions: 20,
    time_minutes: 30,
    aptitude_questions: 15,
    technical_questions: 5,
    is_active: true
  });
  const [editMockTestForm, setEditMockTestForm] = useState<MockTest | null>(null);

  // Mock Test Results state
  interface MockTestResult {
    id: string;
    user_id: string;
    mock_test_id: string;
    score: number;
    total_questions: number;
    percentage: number;
    passed: boolean;
    time_taken_seconds: number;
    completed_at: string;
    user_email?: string;
    user_name?: string;
    test_name?: string;
  }
  const [mockTestResults, setMockTestResults] = useState<MockTestResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsSearchQuery, setResultsSearchQuery] = useState('');

  // Fetch question counts on component load
  useEffect(() => {
    fetchAptitudeQuestionCounts();
    fetchTechnicalQuestionCounts();
    fetchGdQuestionCounts();
    fetchCodingQuestionCounts();
  }, []);

  // Fetch user progress when tab is opened
  const fetchUserProgress = async () => {
    setLoadingProgress(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from('user_progress')
        .select('user_id')
        .then(async (result) => {
          if (result.error) return result;
          // Get unique user IDs
          const userIds = [...new Set((result.data || []).map((p: any) => p.user_id))];
          
          // Fetch user details from profiles table
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          return { data: profiles, error: profilesError };
        });

      if (usersError || !users) {
        console.error('Error fetching users:', usersError);
        setLoadingProgress(false);
        return;
      }

      // Fetch progress for each user
      const userProgressList = await Promise.all(
        users.map(async (user: any) => {
          const { data: aptitudeProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'aptitude');

          const { data: technicalProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'technical');

          const { data: gdProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('question_type', 'gd');

          const aptitudeCorrect = aptitudeProgress?.filter((p: any) => p.is_correct).length || 0;
          const technicalCorrect = technicalProgress?.filter((p: any) => p.is_correct).length || 0;
          const gdCorrect = gdProgress?.filter((p: any) => p.is_correct).length || 0;

          const aptitudeAccuracy = aptitudeProgress && aptitudeProgress.length > 0
            ? Math.round((aptitudeCorrect / aptitudeProgress.length) * 100)
            : 0;

          const technicalAccuracy = technicalProgress && technicalProgress.length > 0
            ? Math.round((technicalCorrect / technicalProgress.length) * 100)
            : 0;

          const gdAccuracy = gdProgress && gdProgress.length > 0
            ? Math.round((gdCorrect / gdProgress.length) * 100)
            : 0;

          return {
            id: user.id,
            email: user.email || 'Unknown',
            name: user.full_name || user.email || 'Unknown User',
            aptitude: {
              attempted: aptitudeProgress?.length || 0,
              correct: aptitudeCorrect,
              accuracy: aptitudeAccuracy
            },
            technical: {
              attempted: technicalProgress?.length || 0,
              correct: technicalCorrect,
              accuracy: technicalAccuracy
            },
            gd: {
              attempted: gdProgress?.length || 0,
              correct: gdCorrect,
              accuracy: gdAccuracy
            }
          };
        })
      );

      setUserProgressData(userProgressList);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      toast({ title: 'Error', description: 'Failed to load user progress', variant: 'destructive' });
    }
    setLoadingProgress(false);
  };

  // Fetch mock test results
  const fetchMockTestResults = async () => {
    setLoadingResults(true);
    try {
      // Fetch all results
      const { data: results, error: resultsError } = await supabase
        .from('mock_test_results')
        .select('*')
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Get unique user IDs and mock test IDs
      const userIds = [...new Set((results || []).map((r: any) => r.user_id))];
      const testIds = [...new Set((results || []).map((r: any) => r.mock_test_id))];

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      // Fetch mock test names
      const { data: tests } = await supabase
        .from('mock_tests')
        .select('id, name')
        .in('id', testIds);

      // Map user and test data to results
      const enrichedResults = (results || []).map((result: any) => {
        const profile = profiles?.find((p: any) => p.user_id === result.user_id);
        const test = tests?.find((t: any) => t.id === result.mock_test_id);
        return {
          ...result,
          user_email: profile?.email || 'Unknown',
          user_name: profile?.full_name || profile?.email || 'Unknown User',
          test_name: test?.name || 'Unknown Test',
        };
      });

      setMockTestResults(enrichedResults);
    } catch (error) {
      console.error('Error fetching mock test results:', error);
      toast({ title: 'Error', description: 'Failed to load mock test results', variant: 'destructive' });
    }
    setLoadingResults(false);
  };

  // Download mock test results as CSV
  const downloadResultsCSV = () => {
    if (mockTestResults.length === 0) {
      toast({ title: 'No Data', description: 'No results to download', variant: 'destructive' });
      return;
    }

    const filteredResults = mockTestResults.filter(r =>
      r.user_email?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
      r.user_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
      r.test_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase())
    );

    const headers = ['User Name', 'Email', 'Test Name', 'Score', 'Total Questions', 'Percentage', 'Passed', 'Time Taken (min)', 'Completed At'];
    const rows = filteredResults.map(r => [
      r.user_name || '',
      r.user_email || '',
      r.test_name || '',
      r.score.toString(),
      r.total_questions.toString(),
      r.percentage.toString() + '%',
      r.passed ? 'Yes' : 'No',
      Math.floor(r.time_taken_seconds / 60).toString(),
      new Date(r.completed_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mock_test_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Success', description: `Downloaded ${filteredResults.length} results` });
  };

  const fetchAptitudeQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('aptitude_questions')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setAptitudeQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching question counts:', error);
    }
  };

  const fetchTechnicalQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('technical_mcq_questions')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setTechnicalQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching technical question counts:', error);
    }
  };

  const fetchGdQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('gd_topics')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (!error && count !== null) {
          counts[level] = count;
        }
      }
      
      setGdQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching GD question counts:', error);
    }
  };

  // Fetch all questions for editing
  const fetchAllAptitudeQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('aptitude_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching aptitude questions:', error);
      } else {
        setAllAptitudeQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching aptitude questions:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchAllTechnicalQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('technical_mcq_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching technical questions:', error);
      } else {
        setAllTechnicalQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching technical questions:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchAllGdQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('gd_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching GD topics:', error);
      } else {
        setAllGdQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching GD topics:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchAllCodingQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('technical_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coding questions:', error);
      } else {
        setAllCodingQuestions(data || []);
      }
    } catch (error) {
      console.error('Error fetching coding questions:', error);
    }
    setLoadingQuestions(false);
  };

  const fetchCodingQuestionCounts = async () => {
    try {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (let level = 1; level <= 4; level++) {
        const { count, error } = await supabase
          .from('technical_questions')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);
        if (!error && count !== null) counts[level] = count;
      }
      setCodingQuestionCounts(counts);
    } catch (error) {
      console.error('Error fetching coding counts:', error);
    }
  };

  const handleAptitudeSubmit = async () => {
    if (!aptitudeForm.question || aptitudeForm.options.some(o => !o) || !aptitudeForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = aptitudeQuestionCounts[aptitudeForm.level] || 0;
    if (currentCount >= 20) {
      toast({ 
        title: 'Limit Reached', 
        description: `Level ${aptitudeForm.level} already has 20 questions. You cannot add more.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('aptitude_questions').insert({
      question: aptitudeForm.question,
      options: aptitudeForm.options,
      correct_answer: aptitudeForm.correctAnswer,
      explanation: aptitudeForm.explanation,
      category: aptitudeForm.category,
      level: aptitudeForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Aptitude question added!' });
      setAptitudeForm({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', category: 'Quantitative', level: 1 });
      
      // Refresh the question counts
      await fetchAptitudeQuestionCounts();
    }
  };

  const handleTechnicalSubmit = async () => {
    if (!technicalForm.question || technicalForm.options.some(o => !o) || !technicalForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = technicalQuestionCounts[technicalForm.level] || 0;
    if (currentCount >= 20) {
      toast({ 
        title: 'Limit Reached', 
        description: `Level ${technicalForm.level} already has 20 questions. You cannot add more.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('technical_mcq_questions').insert({
      question: technicalForm.question,
      options: technicalForm.options,
      correct_answer: technicalForm.correctAnswer,
      explanation: technicalForm.explanation,
      category: technicalForm.category,
      level: technicalForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Technical MCQ added!' });
      setTechnicalForm({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', category: 'Programming', level: 1 });
      await fetchTechnicalQuestionCounts();
    }
  };

  const handleGDSubmit = async () => {
    if (!gdForm.title || !gdForm.description || !gdForm.conclusion) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    // Check if level already has 20 questions
    const currentCount = gdQuestionCounts[gdForm.level] || 0;
    if (currentCount >= 20) {
      toast({ title: 'Error', description: `Level ${gdForm.level} already has 20 questions. Please select a different level.`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('gd_topics').insert({
      title: gdForm.title,
      category: gdForm.category,
      description: gdForm.description,
      points_for: gdForm.pointsFor.filter(p => p),
      points_against: gdForm.pointsAgainst.filter(p => p),
      tips: gdForm.tips.filter(t => t),
      conclusion: gdForm.conclusion,
      level: gdForm.level,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'GD topic added!' });
      setGdForm({ title: '', category: 'Technology', description: '', pointsFor: [''], pointsAgainst: [''], tips: [''], conclusion: '', level: 1 });
      await fetchGdQuestionCounts();
    }
  };

  const addArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips') => {
    setGdForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips', index: number) => {
    setGdForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const updateArrayItem = (field: 'pointsFor' | 'pointsAgainst' | 'tips', index: number, value: string) => {
    setGdForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  // Update handlers
  const handleUpdateAptitude = async () => {
    if (!editAptitudeForm.question || editAptitudeForm.options.some((o: string) => !o) || !editAptitudeForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('aptitude_questions')
      .update({
        question: editAptitudeForm.question,
        options: editAptitudeForm.options,
        correct_answer: editAptitudeForm.correct_answer,
        explanation: editAptitudeForm.explanation,
        category: editAptitudeForm.category,
        level: editAptitudeForm.level
      })
      .eq('id', editingAptitudeId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Aptitude question updated!' });
      setEditingAptitudeId(null);
      setEditAptitudeForm(null);
      await fetchAllAptitudeQuestions();
      await fetchAptitudeQuestionCounts();
    }
  };

  const handleUpdateTechnical = async () => {
    if (!editTechnicalForm.question || editTechnicalForm.options.some((o: string) => !o) || !editTechnicalForm.explanation) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('technical_mcq_questions')
      .update({
        question: editTechnicalForm.question,
        options: editTechnicalForm.options,
        correct_answer: editTechnicalForm.correct_answer,
        explanation: editTechnicalForm.explanation,
        category: editTechnicalForm.category,
        level: editTechnicalForm.level
      })
      .eq('id', editingTechnicalId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Technical MCQ updated!' });
      setEditingTechnicalId(null);
      setEditTechnicalForm(null);
      await fetchAllTechnicalQuestions();
      await fetchTechnicalQuestionCounts();
    }
  };

  const handleUpdateGd = async () => {
    if (!editGdForm.title || !editGdForm.description || !editGdForm.conclusion) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('gd_topics')
      .update({
        title: editGdForm.title,
        category: editGdForm.category,
        description: editGdForm.description,
        points_for: editGdForm.points_for.filter((p: string) => p),
        points_against: editGdForm.points_against.filter((p: string) => p),
        tips: editGdForm.tips.filter((t: string) => t),
        conclusion: editGdForm.conclusion,
        level: editGdForm.level
      })
      .eq('id', editingGdId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'GD topic updated!' });
      setEditingGdId(null);
      setEditGdForm(null);
      await fetchAllGdQuestions();
      await fetchGdQuestionCounts();
    }
  };

  // Delete handlers
  const handleDeleteAptitude = async (id: string) => {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      const { error } = await supabase
        .from('aptitude_questions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question deleted!' });
        await fetchAllAptitudeQuestions();
        await fetchAptitudeQuestionCounts();
      }
    }
  };

  const handleDeleteTechnical = async (id: string) => {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      const { error } = await supabase
        .from('technical_mcq_questions')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question deleted!' });
        await fetchAllTechnicalQuestions();
        await fetchTechnicalQuestionCounts();
      }
    }
  };

  const handleDeleteGd = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      const { error } = await supabase
        .from('gd_topics')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Topic deleted!' });
        await fetchAllGdQuestions();
        await fetchGdQuestionCounts();
      }
    }
  };

  // Bulk delete handlers
  const handleBulkDeleteAptitude = async () => {
    if (selectedAptitudeIds.size === 0) {
      toast({ title: 'No Selection', description: 'Please select questions to delete', variant: 'destructive' });
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedAptitudeIds.size} question(s)? This action cannot be undone.`)) return;
    
    setBulkDeleting(true);
    const { error } = await supabase
      .from('aptitude_questions')
      .delete()
      .in('id', Array.from(selectedAptitudeIds));

    setBulkDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${selectedAptitudeIds.size} question(s) deleted!` });
      setSelectedAptitudeIds(new Set());
      await fetchAllAptitudeQuestions();
      await fetchAptitudeQuestionCounts();
    }
  };

  const handleBulkDeleteTechnical = async () => {
    if (selectedTechnicalIds.size === 0) {
      toast({ title: 'No Selection', description: 'Please select questions to delete', variant: 'destructive' });
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedTechnicalIds.size} question(s)? This action cannot be undone.`)) return;
    
    setBulkDeleting(true);
    const { error } = await supabase
      .from('technical_mcq_questions')
      .delete()
      .in('id', Array.from(selectedTechnicalIds));

    setBulkDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${selectedTechnicalIds.size} question(s) deleted!` });
      setSelectedTechnicalIds(new Set());
      await fetchAllTechnicalQuestions();
      await fetchTechnicalQuestionCounts();
    }
  };

  const handleBulkDeleteGd = async () => {
    if (selectedGdIds.size === 0) {
      toast({ title: 'No Selection', description: 'Please select topics to delete', variant: 'destructive' });
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedGdIds.size} topic(s)? This action cannot be undone.`)) return;
    
    setBulkDeleting(true);
    const { error } = await supabase
      .from('gd_topics')
      .delete()
      .in('id', Array.from(selectedGdIds));

    setBulkDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${selectedGdIds.size} topic(s) deleted!` });
      setSelectedGdIds(new Set());
      await fetchAllGdQuestions();
      await fetchGdQuestionCounts();
    }
  };

  // Toggle selection helpers
  const toggleAptitudeSelection = (id: string) => {
    setSelectedAptitudeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTechnicalSelection = (id: string) => {
    setSelectedTechnicalIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGdSelection = (id: string) => {
    setSelectedGdIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAptitude = () => {
    if (selectedAptitudeIds.size === allAptitudeQuestions.length) {
      setSelectedAptitudeIds(new Set());
    } else {
      setSelectedAptitudeIds(new Set(allAptitudeQuestions.map(q => q.id)));
    }
  };

  const toggleAllTechnical = () => {
    if (selectedTechnicalIds.size === allTechnicalQuestions.length) {
      setSelectedTechnicalIds(new Set());
    } else {
      setSelectedTechnicalIds(new Set(allTechnicalQuestions.map(q => q.id)));
    }
  };

  const toggleAllGd = () => {
    if (selectedGdIds.size === allGdQuestions.length) {
      setSelectedGdIds(new Set());
    } else {
      setSelectedGdIds(new Set(allGdQuestions.map(q => q.id)));
    }
  };

  const toggleAllCoding = () => {
    if (selectedCodingIds.size === allCodingQuestions.length) {
      setSelectedCodingIds(new Set());
    } else {
      setSelectedCodingIds(new Set(allCodingQuestions.map(q => q.id)));
    }
  };

  const toggleCodingSelection = (id: string) => {
    setSelectedCodingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCodingSubmit = async () => {
    if (!codingForm.title || !codingForm.description || !codingForm.approach || !codingForm.solution) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    const currentCount = codingQuestionCounts[codingForm.level] || 0;
    if (currentCount >= 20) {
      toast({ title: 'Limit Reached', description: `Level ${codingForm.level} already has 20 questions.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('technical_questions').insert({
      title: codingForm.title,
      description: codingForm.description,
      difficulty: codingForm.difficulty,
      category: codingForm.category,
      level: codingForm.level,
      examples: codingForm.examples.filter(e => e.input || e.output),
      approach: codingForm.approach,
      solution: codingForm.solution,
      created_by: user?.id
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Coding question added!' });
      setCodingForm({ title: '', description: '', difficulty: 'Easy', category: 'Arrays', level: 1, examples: [{ input: '', output: '' }], approach: '', solution: '' });
      await fetchCodingQuestionCounts();
    }
  };

  const handleUpdateCoding = async () => {
    if (!editCodingForm?.title || !editCodingForm?.description) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('technical_questions').update({
      title: editCodingForm.title,
      description: editCodingForm.description,
      difficulty: editCodingForm.difficulty,
      category: editCodingForm.category,
      level: editCodingForm.level,
      approach: editCodingForm.approach,
      solution: editCodingForm.solution,
      examples: editCodingForm.examples
    }).eq('id', editingCodingId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Coding question updated!' });
      setEditingCodingId(null);
      setEditCodingForm(null);
      await fetchAllCodingQuestions();
      await fetchCodingQuestionCounts();
    }
  };

  const handleDeleteCoding = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const { error } = await supabase.from('technical_questions').delete().eq('id', id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question deleted!' });
        await fetchAllCodingQuestions();
        await fetchCodingQuestionCounts();
      }
    }
  };

  const handleBulkDeleteCoding = async () => {
    if (selectedCodingIds.size === 0) {
      toast({ title: 'No Selection', description: 'Please select questions to delete', variant: 'destructive' });
      return;
    }
    if (!confirm(`Delete ${selectedCodingIds.size} question(s)?`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('technical_questions').delete().in('id', Array.from(selectedCodingIds));
    setBulkDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${selectedCodingIds.size} question(s) deleted!` });
      setSelectedCodingIds(new Set());
      await fetchAllCodingQuestions();
      await fetchCodingQuestionCounts();
    }
  };

  // Mock Tests CRUD functions
  const fetchMockTests = async () => {
    setLoadingMockTests(true);
    try {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mock tests:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setMockTests((data || []) as MockTest[]);
      }
    } catch (error) {
      console.error('Error fetching mock tests:', error);
    }
    setLoadingMockTests(false);
  };

  const handleMockTestSubmit = async () => {
    if (!mockTestForm.name || mockTestForm.total_questions <= 0) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('mock_tests').insert({
      name: mockTestForm.name,
      difficulty: mockTestForm.difficulty,
      description: mockTestForm.description || null,
      total_questions: mockTestForm.total_questions,
      time_minutes: mockTestForm.time_minutes,
      aptitude_questions: mockTestForm.aptitude_questions,
      technical_questions: mockTestForm.technical_questions,
      is_active: mockTestForm.is_active,
      created_by: user?.id
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Mock test created!' });
      setMockTestForm({
        name: '',
        difficulty: 'medium',
        description: '',
        total_questions: 20,
        time_minutes: 30,
        aptitude_questions: 15,
        technical_questions: 5,
        is_active: true
      });
      await fetchMockTests();
    }
  };

  const handleUpdateMockTest = async () => {
    if (!editMockTestForm?.name || editMockTestForm.total_questions <= 0) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('mock_tests')
      .update({
        name: editMockTestForm.name,
        difficulty: editMockTestForm.difficulty,
        description: editMockTestForm.description,
        total_questions: editMockTestForm.total_questions,
        time_minutes: editMockTestForm.time_minutes,
        aptitude_questions: editMockTestForm.aptitude_questions,
        technical_questions: editMockTestForm.technical_questions,
        is_active: editMockTestForm.is_active
      })
      .eq('id', editingMockTestId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Mock test updated!' });
      setEditingMockTestId(null);
      setEditMockTestForm(null);
      await fetchMockTests();
    }
  };

  const handleDeleteMockTest = async (id: string) => {
    if (confirm('Are you sure you want to delete this mock test? This action cannot be undone.')) {
      const { error } = await supabase
        .from('mock_tests')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Mock test deleted!' });
        await fetchMockTests();
      }
    }
  };

  const toggleMockTestStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('mock_tests')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Mock test ${!currentStatus ? 'activated' : 'deactivated'}!` });
      await fetchMockTests();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="aptitude" className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 bg-transparent border-b border-border p-0 h-auto justify-start overflow-x-auto">
            <TabsTrigger value="aptitude" className="flex items-center gap-2 whitespace-nowrap">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Aptitude</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2 whitespace-nowrap">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Technical</span>
            </TabsTrigger>
            <TabsTrigger value="gd" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">GD Topics</span>
            </TabsTrigger>
            <TabsTrigger value="coding" className="flex items-center gap-2 whitespace-nowrap">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Coding</span>
            </TabsTrigger>
            <TabsTrigger value="manage-apt" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage Apt</span>
            </TabsTrigger>
            <TabsTrigger value="manage-tech" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage Tech</span>
            </TabsTrigger>
            <TabsTrigger value="manage-gd" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Trash2 className="h-3 w-3" />
              <span>Manage GD</span>
            </TabsTrigger>
            <TabsTrigger value="manage-coding" className="flex items-center gap-1 text-xs whitespace-nowrap" onClick={fetchAllCodingQuestions}>
              <Trash2 className="h-3 w-3" />
              <span>Manage Coding</span>
            </TabsTrigger>
            <TabsTrigger value="import-apt" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Apt</span>
            </TabsTrigger>
            <TabsTrigger value="import-tech" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Tech</span>
            </TabsTrigger>
            <TabsTrigger value="import-gd" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import GD</span>
            </TabsTrigger>
            <TabsTrigger value="import-coding" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Coding</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">User Progress</span>
            </TabsTrigger>
            <TabsTrigger value="mock-tests" className="flex items-center gap-2 whitespace-nowrap" onClick={fetchMockTests}>
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Mock Tests</span>
            </TabsTrigger>
            <TabsTrigger value="import-mock" className="flex items-center gap-1 text-xs whitespace-nowrap">
              <Plus className="h-3 w-3" />
              <span>Import Mock</span>
            </TabsTrigger>
            <TabsTrigger value="test-results" className="flex items-center gap-2 whitespace-nowrap" onClick={fetchMockTestResults}>
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Test Results</span>
            </TabsTrigger>
          </TabsList>

          {/* Aptitude Tab */}
          <TabsContent value="aptitude">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Add Aptitude Question
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Questions Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = aptitudeQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-primary'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {aptitudeForm.level} already has 20 questions. Please select a different level to continue adding questions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={aptitudeForm.category} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quantitative">Quantitative</SelectItem>
                        <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                        <SelectItem value="Verbal Ability">Verbal Ability</SelectItem>
                        <SelectItem value="Data Interpretation">Data Interpretation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={aptitudeForm.level.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={aptitudeForm.question}
                    onChange={(e) => setAptitudeForm(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter your question..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Options</Label>
                  {aptitudeForm.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...aptitudeForm.options];
                          newOptions[index] = e.target.value;
                          setAptitudeForm(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Correct Answer</Label>
                  <Select value={aptitudeForm.correctAnswer.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, correctAnswer: parseInt(v) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aptitudeForm.options.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Option {String.fromCharCode(65 + index)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Explanation</Label>
                  <Textarea
                    value={aptitudeForm.explanation}
                    onChange={(e) => setAptitudeForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why this is the correct answer..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleAptitudeSubmit} 
                  disabled={saving || (aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 
                    ? 'Level Full - Cannot Add More' 
                    : saving 
                    ? 'Saving...' 
                    : 'Save Aptitude Question'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-accent" />
                  Add Technical MCQ
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Questions Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = technicalQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-accent'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(technicalQuestionCounts[technicalForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {technicalForm.level} already has 20 questions. Please select a different level to continue adding questions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={technicalForm.category} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Programming">Programming</SelectItem>
                        <SelectItem value="Data Structures">Data Structures</SelectItem>
                        <SelectItem value="Algorithms">Algorithms</SelectItem>
                        <SelectItem value="Database">Database</SelectItem>
                        <SelectItem value="Networking">Networking</SelectItem>
                        <SelectItem value="Operating Systems">Operating Systems</SelectItem>
                        <SelectItem value="Web Development">Web Development</SelectItem>
                        <SelectItem value="OOPs">OOPs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={technicalForm.level.toString()} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={technicalForm.question}
                    onChange={(e) => setTechnicalForm(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter the technical MCQ question..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {technicalForm.options.map((option, index) => (
                    <div key={index}>
                      <Label>Option {String.fromCharCode(65 + index)}</Label>
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...technicalForm.options];
                          newOptions[index] = e.target.value;
                          setTechnicalForm(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Correct Answer</Label>
                  <Select value={technicalForm.correctAnswer.toString()} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, correctAnswer: parseInt(v) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {technicalForm.options.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Option {String.fromCharCode(65 + index)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Explanation</Label>
                  <Textarea
                    value={technicalForm.explanation}
                    onChange={(e) => setTechnicalForm(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain why this is the correct answer..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleTechnicalSubmit} 
                  disabled={saving || (technicalQuestionCounts[technicalForm.level] || 0) >= 20}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {(technicalQuestionCounts[technicalForm.level] || 0) >= 20 
                    ? 'Level Full - Cannot Add More' 
                    : saving 
                    ? 'Saving...' 
                    : 'Save Technical MCQ'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GD Topics Tab */}
          <TabsContent value="gd">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-success" />
                  Add Group Discussion Topic
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Topics Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = gdQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-success'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(gdQuestionCounts[gdForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {gdForm.level} already has 20 topics. Please select a different level to continue adding topics.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={gdForm.title}
                      onChange={(e) => setGdForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., AI in Healthcare"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={gdForm.category} onValueChange={(v) => setGdForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Environment">Environment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={gdForm.level.toString()} onValueChange={(v) => setGdForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={gdForm.description}
                    onChange={(e) => setGdForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief overview of the topic..."
                    rows={3}
                  />
                </div>

                {/* Points For */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-success">Points For</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pointsFor')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Point
                    </Button>
                  </div>
                  {gdForm.pointsFor.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updateArrayItem('pointsFor', index, e.target.value)}
                        placeholder={`Point ${index + 1} in favor...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('pointsFor', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Points Against */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-destructive">Points Against</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pointsAgainst')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Point
                    </Button>
                  </div>
                  {gdForm.pointsAgainst.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updateArrayItem('pointsAgainst', index, e.target.value)}
                        placeholder={`Point ${index + 1} against...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('pointsAgainst', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-primary">Tips</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('tips')}>
                      <Plus className="h-4 w-4 mr-1" /> Add Tip
                    </Button>
                  </div>
                  {gdForm.tips.map((tip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={tip}
                        onChange={(e) => updateArrayItem('tips', index, e.target.value)}
                        placeholder={`Tip ${index + 1}...`}
                      />
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('tips', index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Model Conclusion</Label>
                  <Textarea
                    value={gdForm.conclusion}
                    onChange={(e) => setGdForm(prev => ({ ...prev, conclusion: e.target.value }))}
                    placeholder="A balanced conclusion for this topic..."
                    rows={4}
                  />
                </div>

                <Button onClick={handleGDSubmit} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save GD Topic'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Aptitude Questions Tab */}
          <TabsContent value="manage-apt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Edit/Delete Aptitude Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={fetchAllAptitudeQuestions} variant="outline">
                    {loadingQuestions ? 'Loading...' : 'Load All Questions'}
                  </Button>
                  {allAptitudeQuestions.length > 0 && (
                    <>
                      <Button 
                        onClick={toggleAllAptitude} 
                        variant="outline"
                        size="sm"
                      >
                        {selectedAptitudeIds.size === allAptitudeQuestions.length ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All</>
                        )}
                      </Button>
                      {selectedAptitudeIds.size > 0 && (
                        <Button 
                          onClick={handleBulkDeleteAptitude} 
                          variant="destructive"
                          size="sm"
                          disabled={bulkDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedAptitudeIds.size})`}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allAptitudeQuestions.map((q: any) => (
                    <div key={q.id} className={`p-4 border rounded-lg bg-card ${selectedAptitudeIds.has(q.id) ? 'border-primary' : 'border-border'}`}>
                      {editingAptitudeId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Question</Label>
                            <Textarea
                              value={editAptitudeForm?.question}
                              onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, question: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editAptitudeForm?.category} onValueChange={(v) => setEditAptitudeForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Quantitative">Quantitative</SelectItem>
                                  <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                                  <SelectItem value="Verbal Ability">Verbal Ability</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editAptitudeForm?.level?.toString()} onValueChange={(v) => setEditAptitudeForm(prev => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {editAptitudeForm?.options?.map((opt: string, idx: number) => (
                            <div key={idx}>
                              <Label>Option {idx + 1}</Label>
                              <Input value={opt} onChange={(e) => setEditAptitudeForm(prev => ({
                                ...prev,
                                options: prev.options.map((o: string, i: number) => i === idx ? e.target.value : o)
                              }))} />
                            </div>
                          ))}
                          <div>
                            <Label>Correct Answer (0-3)</Label>
                            <Input type="number" min="0" max="3" value={editAptitudeForm?.correct_answer} onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} />
                          </div>
                          <div>
                            <Label>Explanation</Label>
                            <Textarea value={editAptitudeForm?.explanation} onChange={(e) => setEditAptitudeForm(prev => ({ ...prev, explanation: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateAptitude} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingAptitudeId(null); setEditAptitudeForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleAptitudeSelection(q.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {selectedAptitudeIds.has(q.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex justify-between items-start flex-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.question?.substring(0, 60)}...</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{q.category}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingAptitudeId(q.id);
                                setEditAptitudeForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteAptitude(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Technical Questions Tab */}
          <TabsContent value="manage-tech">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-accent" />
                  Edit/Delete Technical MCQs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={fetchAllTechnicalQuestions} variant="outline">
                    {loadingQuestions ? 'Loading...' : 'Load All Questions'}
                  </Button>
                  {allTechnicalQuestions.length > 0 && (
                    <>
                      <Button 
                        onClick={toggleAllTechnical} 
                        variant="outline"
                        size="sm"
                      >
                        {selectedTechnicalIds.size === allTechnicalQuestions.length ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All</>
                        )}
                      </Button>
                      {selectedTechnicalIds.size > 0 && (
                        <Button 
                          onClick={handleBulkDeleteTechnical} 
                          variant="destructive"
                          size="sm"
                          disabled={bulkDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedTechnicalIds.size})`}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allTechnicalQuestions.map((q: any) => (
                    <div key={q.id} className={`p-4 border rounded-lg bg-card ${selectedTechnicalIds.has(q.id) ? 'border-primary' : 'border-border'}`}>
                      {editingTechnicalId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Question</Label>
                            <Textarea value={editTechnicalForm?.question} onChange={(e) => setEditTechnicalForm((prev: any) => ({ ...prev, question: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editTechnicalForm?.category} onValueChange={(v) => setEditTechnicalForm((prev: any) => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Programming">Programming</SelectItem>
                                  <SelectItem value="Data Structures">Data Structures</SelectItem>
                                  <SelectItem value="Algorithms">Algorithms</SelectItem>
                                  <SelectItem value="Database">Database</SelectItem>
                                  <SelectItem value="Networking">Networking</SelectItem>
                                  <SelectItem value="Operating Systems">Operating Systems</SelectItem>
                                  <SelectItem value="Web Development">Web Development</SelectItem>
                                  <SelectItem value="OOPs">OOPs</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editTechnicalForm?.level?.toString()} onValueChange={(v) => setEditTechnicalForm((prev: any) => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {editTechnicalForm?.options?.map((opt: string, idx: number) => (
                            <div key={idx}>
                              <Label>Option {idx + 1}</Label>
                              <Input value={opt} onChange={(e) => setEditTechnicalForm((prev: any) => ({
                                ...prev,
                                options: prev.options.map((o: string, i: number) => i === idx ? e.target.value : o)
                              }))} />
                            </div>
                          ))}
                          <div>
                            <Label>Correct Answer (0-3)</Label>
                            <Input type="number" min="0" max="3" value={editTechnicalForm?.correct_answer} onChange={(e) => setEditTechnicalForm((prev: any) => ({ ...prev, correct_answer: parseInt(e.target.value) }))} />
                          </div>
                          <div>
                            <Label>Explanation</Label>
                            <Textarea value={editTechnicalForm?.explanation} onChange={(e) => setEditTechnicalForm((prev: any) => ({ ...prev, explanation: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateTechnical} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingTechnicalId(null); setEditTechnicalForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTechnicalSelection(q.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {selectedTechnicalIds.has(q.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex justify-between items-start flex-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.question?.substring(0, 60)}...</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">{q.category}</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingTechnicalId(q.id);
                                setEditTechnicalForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteTechnical(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage GD Topics Tab */}
          <TabsContent value="manage-gd">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-success" />
                  Edit/Delete GD Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={fetchAllGdQuestions} variant="outline">
                    {loadingQuestions ? 'Loading...' : 'Load All Topics'}
                  </Button>
                  {allGdQuestions.length > 0 && (
                    <>
                      <Button 
                        onClick={toggleAllGd} 
                        variant="outline"
                        size="sm"
                      >
                        {selectedGdIds.size === allGdQuestions.length ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All</>
                        )}
                      </Button>
                      {selectedGdIds.size > 0 && (
                        <Button 
                          onClick={handleBulkDeleteGd} 
                          variant="destructive"
                          size="sm"
                          disabled={bulkDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedGdIds.size})`}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allGdQuestions.map((q: any) => (
                    <div key={q.id} className={`p-4 border rounded-lg bg-card ${selectedGdIds.has(q.id) ? 'border-primary' : 'border-border'}`}>
                      {editingGdId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Title</Label>
                            <Input value={editGdForm?.title} onChange={(e) => setEditGdForm(prev => ({ ...prev, title: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editGdForm?.category} onValueChange={(v) => setEditGdForm(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Technology">Technology</SelectItem>
                                  <SelectItem value="Social">Social</SelectItem>
                                  <SelectItem value="Business">Business</SelectItem>
                                  <SelectItem value="Finance">Finance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editGdForm?.level?.toString()} onValueChange={(v) => setEditGdForm(prev => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea value={editGdForm?.description} onChange={(e) => setEditGdForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                          </div>
                          <div>
                            <Label>Conclusion</Label>
                            <Textarea value={editGdForm?.conclusion} onChange={(e) => setEditGdForm(prev => ({ ...prev, conclusion: e.target.value }))} rows={2} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateGd} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingGdId(null); setEditGdForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleGdSelection(q.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {selectedGdIds.has(q.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex justify-between items-start flex-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.title}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">{q.category}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingGdId(q.id);
                                setEditGdForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteGd(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Import - Aptitude Tab */}
          <TabsContent value="import-apt">
            <CSVImport 
              type="aptitude"
              onCountsUpdated={fetchAptitudeQuestionCounts}
            />
          </TabsContent>

          {/* CSV Import - Technical Tab */}
          <TabsContent value="import-tech">
            <CSVImport 
              type="technical"
              onCountsUpdated={fetchTechnicalQuestionCounts}
            />
          </TabsContent>

          {/* CSV Import - GD Tab */}
          <TabsContent value="import-gd">
            <CSVImport 
              type="gd"
              onCountsUpdated={fetchGdQuestionCounts}
            />
          </TabsContent>

          {/* Coding Tab - Add New Coding Question */}
          <TabsContent value="coding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-warning" />
                  Add Coding Question
                </CardTitle>
              </CardHeader>
              
              {/* Question Count Status */}
              <CardContent className="pb-0 pt-4 border-b border-border">
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">Coding Questions Added per Level (Max 20)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((level) => {
                      const count = codingQuestionCounts[level] || 0;
                      const isFull = count >= 20;
                      const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                      
                      return (
                        <div
                          key={level}
                          className={`p-4 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isFull
                              ? 'border-success/50 bg-success/5'
                              : count >= 15
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">Level {level}</p>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-lg font-bold ${isFull ? 'text-success' : count >= 15 ? 'text-warning' : 'text-warning'}`}>
                              {count}/20
                            </span>
                            {isFull && <CheckCircle2 className="w-4 h-4 text-success" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>

              {/* Limit warning if current level is full */}
              {(codingQuestionCounts[codingForm.level] || 0) >= 20 && (
                <CardContent className="pt-4 pb-0 border-b border-border">
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive ml-2">
                      Level {codingForm.level} already has 20 questions. Please select a different level to continue adding questions.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}

              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={codingForm.category} onValueChange={(v) => setCodingForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arrays">Arrays</SelectItem>
                        <SelectItem value="Strings">Strings</SelectItem>
                        <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                        <SelectItem value="Trees">Trees</SelectItem>
                        <SelectItem value="Graphs">Graphs</SelectItem>
                        <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                        <SelectItem value="Recursion">Recursion</SelectItem>
                        <SelectItem value="Sorting">Sorting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={codingForm.difficulty} onValueChange={(v) => setCodingForm(prev => ({ ...prev, difficulty: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={codingForm.level.toString()} onValueChange={(v) => setCodingForm(prev => ({ ...prev, level: parseInt(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Beginner</SelectItem>
                        <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                        <SelectItem value="3">Level 3 - Advanced</SelectItem>
                        <SelectItem value="4">Final Level - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={codingForm.title}
                    onChange={(e) => setCodingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Two Sum, Reverse String"
                  />
                </div>

                <div>
                  <Label>Problem Description</Label>
                  <Textarea
                    value={codingForm.description}
                    onChange={(e) => setCodingForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the problem clearly. Include input/output format and constraints."
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="flex items-center justify-between">
                    <span>Examples</span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCodingForm(prev => ({ 
                        ...prev, 
                        examples: [...prev.examples, { input: '', output: '' }] 
                      }))}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Example
                    </Button>
                  </Label>
                  <div className="space-y-3 mt-2">
                    {codingForm.examples.map((example, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-border rounded-lg bg-muted/30">
                        <div>
                          <Label className="text-xs">Input</Label>
                          <Input
                            value={example.input}
                            onChange={(e) => {
                              const newExamples = [...codingForm.examples];
                              newExamples[idx].input = e.target.value;
                              setCodingForm(prev => ({ ...prev, examples: newExamples }));
                            }}
                            placeholder="e.g., nums = [2,7,11,15], target = 9"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Output</Label>
                            <Input
                              value={example.output}
                              onChange={(e) => {
                                const newExamples = [...codingForm.examples];
                                newExamples[idx].output = e.target.value;
                                setCodingForm(prev => ({ ...prev, examples: newExamples }));
                              }}
                              placeholder="e.g., [0, 1]"
                            />
                          </div>
                          {codingForm.examples.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              className="mt-5"
                              onClick={() => {
                                const newExamples = codingForm.examples.filter((_, i) => i !== idx);
                                setCodingForm(prev => ({ ...prev, examples: newExamples }));
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Approach / Hints</Label>
                  <Textarea
                    value={codingForm.approach}
                    onChange={(e) => setCodingForm(prev => ({ ...prev, approach: e.target.value }))}
                    placeholder="Explain the approach to solve this problem. Include time and space complexity."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Solution Code</Label>
                  <Textarea
                    value={codingForm.solution}
                    onChange={(e) => setCodingForm(prev => ({ ...prev, solution: e.target.value }))}
                    placeholder="Write the solution code (JavaScript preferred)"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <Button 
                  onClick={handleCodingSubmit} 
                  disabled={saving || (codingQuestionCounts[codingForm.level] || 0) >= 20}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {(codingQuestionCounts[codingForm.level] || 0) >= 20 
                    ? 'Level Full - Cannot Add More' 
                    : saving 
                    ? 'Saving...' 
                    : 'Save Coding Question'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Coding Questions Tab */}
          <TabsContent value="manage-coding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-warning" />
                  Edit/Delete Coding Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={fetchAllCodingQuestions} variant="outline">
                    {loadingQuestions ? 'Loading...' : 'Load All Questions'}
                  </Button>
                  {allCodingQuestions.length > 0 && (
                    <>
                      <Button 
                        onClick={toggleAllCoding} 
                        variant="outline"
                        size="sm"
                      >
                        {selectedCodingIds.size === allCodingQuestions.length ? (
                          <><CheckSquare className="h-4 w-4 mr-1" /> Deselect All</>
                        ) : (
                          <><Square className="h-4 w-4 mr-1" /> Select All</>
                        )}
                      </Button>
                      {selectedCodingIds.size > 0 && (
                        <Button 
                          onClick={handleBulkDeleteCoding} 
                          variant="destructive"
                          size="sm"
                          disabled={bulkDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCodingIds.size})`}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allCodingQuestions.map((q: any) => (
                    <div key={q.id} className={`p-4 border rounded-lg bg-card ${selectedCodingIds.has(q.id) ? 'border-primary' : 'border-border'}`}>
                      {editingCodingId === q.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Title</Label>
                            <Input value={editCodingForm?.title} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, title: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea value={editCodingForm?.description} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, description: e.target.value }))} rows={3} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>Category</Label>
                              <Select value={editCodingForm?.category} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Arrays">Arrays</SelectItem>
                                  <SelectItem value="Strings">Strings</SelectItem>
                                  <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                                  <SelectItem value="Trees">Trees</SelectItem>
                                  <SelectItem value="Graphs">Graphs</SelectItem>
                                  <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
                                  <SelectItem value="Recursion">Recursion</SelectItem>
                                  <SelectItem value="Sorting">Sorting</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Difficulty</Label>
                              <Select value={editCodingForm?.difficulty} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, difficulty: v }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Easy">Easy</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Level</Label>
                              <Select value={editCodingForm?.level?.toString()} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, level: parseInt(v) }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Level 1</SelectItem>
                                  <SelectItem value="2">Level 2</SelectItem>
                                  <SelectItem value="3">Level 3</SelectItem>
                                  <SelectItem value="4">Level 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Approach</Label>
                            <Textarea value={editCodingForm?.approach} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, approach: e.target.value }))} rows={2} />
                          </div>
                          <div>
                            <Label>Solution</Label>
                            <Textarea value={editCodingForm?.solution} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, solution: e.target.value }))} rows={4} className="font-mono text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateCoding} disabled={saving} className="flex-1">Save Changes</Button>
                            <Button onClick={() => {setEditingCodingId(null); setEditCodingForm(null);}} variant="outline" className="flex-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleCodingSelection(q.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {selectedCodingIds.has(q.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex justify-between items-start flex-1">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{q.description?.substring(0, 80)}...</p>
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded">{q.category}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  q.difficulty === 'Easy' ? 'bg-success/10 text-success' :
                                  q.difficulty === 'Medium' ? 'bg-warning/10 text-warning' :
                                  'bg-destructive/10 text-destructive'
                                }`}>{q.difficulty}</span>
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">Level {q.level}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                setEditingCodingId(q.id);
                                setEditCodingForm({ ...q });
                              }}>Edit</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteCoding(q.id)}>Delete</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Import - Coding Tab */}
          <TabsContent value="import-coding">
            <CSVImport 
              type="coding"
              onCountsUpdated={fetchCodingQuestionCounts}
            />
          </TabsContent>

          {/* User Progress Tab */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  User Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Search by Name or Email</Label>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Filter by Category</Label>
                    <Select value={progressCategory} onValueChange={(v: any) => setProgressCategory(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="aptitude">Aptitude Only</SelectItem>
                        <SelectItem value="technical">Technical Only</SelectItem>
                        <SelectItem value="gd">GD Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Load Button */}
                <Button 
                  onClick={fetchUserProgress} 
                  disabled={loadingProgress}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {loadingProgress ? 'Loading...' : 'Load User Progress'}
                </Button>

                {/* User Progress Table */}
                {userProgressData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground">User</th>
                          {(progressCategory === 'all' || progressCategory === 'aptitude') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Aptitude</th>
                            </>
                          )}
                          {(progressCategory === 'all' || progressCategory === 'technical') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Technical</th>
                            </>
                          )}
                          {(progressCategory === 'all' || progressCategory === 'gd') && (
                            <>
                              <th className="text-center py-3 px-4 font-semibold text-foreground">Group Discussion</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {userProgressData
                          .filter(user => 
                            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((user) => (
                            <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-4">
                                <div>
                                  <p className="font-medium text-foreground">{user.name}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </td>
                              {(progressCategory === 'all' || progressCategory === 'aptitude') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-primary/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-primary">{user.aptitude.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.aptitude.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${user.aptitude.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.aptitude.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'technical') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-accent/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-accent">{user.technical.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.technical.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-accent transition-all"
                                        style={{ width: `${user.technical.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.technical.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'gd') && (
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-block bg-secondary/10 rounded-lg p-3">
                                    <p className="text-lg font-bold text-secondary">{user.gd.attempted}</p>
                                    <p className="text-xs text-muted-foreground">Attempted</p>
                                    <p className="text-sm font-semibold text-success mt-1">{user.gd.correct} correct</p>
                                    <div className="mt-2 w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-secondary transition-all"
                                        style={{ width: `${user.gd.accuracy}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{user.gd.accuracy}% accuracy</p>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty State */}
                {userProgressData.length === 0 && !loadingProgress && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Click "Load User Progress" to view all user data</p>
                  </div>
                )}

                {/* Loading State */}
                {loadingProgress && (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading user progress...</p>
                  </div>
                )}

                {/* No Results */}
                {userProgressData.length > 0 && 
                 userProgressData.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No users found matching your search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mock Tests Management Tab */}
          <TabsContent value="mock-tests">
            <div className="space-y-6">
              {/* Create New Mock Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create New Mock Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Test Name *</Label>
                      <Input
                        value={mockTestForm.name}
                        onChange={(e) => setMockTestForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Level 1 Assessment"
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={mockTestForm.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setMockTestForm(prev => ({ ...prev, difficulty: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={mockTestForm.description}
                      onChange={(e) => setMockTestForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this mock test..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Total Questions</Label>
                      <Input
                        type="number"
                        min={1}
                        value={mockTestForm.total_questions}
                        onChange={(e) => setMockTestForm(prev => ({ ...prev, total_questions: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Time (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={mockTestForm.time_minutes}
                        onChange={(e) => setMockTestForm(prev => ({ ...prev, time_minutes: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Aptitude Questions</Label>
                      <Input
                        type="number"
                        min={0}
                        value={mockTestForm.aptitude_questions}
                        onChange={(e) => setMockTestForm(prev => ({ ...prev, aptitude_questions: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Technical Questions</Label>
                      <Input
                        type="number"
                        min={0}
                        value={mockTestForm.technical_questions}
                        onChange={(e) => setMockTestForm(prev => ({ ...prev, technical_questions: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mockTestForm.is_active}
                      onCheckedChange={(checked) => setMockTestForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active (visible to users)</Label>
                  </div>

                  <Button onClick={handleMockTestSubmit} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Create Mock Test'}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Mock Tests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent" />
                    Manage Mock Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={fetchMockTests} variant="outline" className="mb-4">
                    {loadingMockTests ? 'Loading...' : 'Refresh Mock Tests'}
                  </Button>

                  {mockTests.length === 0 && !loadingMockTests && (
                    <div className="text-center py-8">
                      <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No mock tests created yet</p>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {mockTests.map((test) => (
                      <div key={test.id} className="p-4 border border-border rounded-lg bg-card">
                        {editingMockTestId === test.id && editMockTestForm ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Test Name *</Label>
                                <Input
                                  value={editMockTestForm.name}
                                  onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label>Difficulty</Label>
                                <Select value={editMockTestForm.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setEditMockTestForm(prev => prev ? { ...prev, difficulty: v } : null)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={editMockTestForm.description || ''}
                                onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <Label>Total Questions</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={editMockTestForm.total_questions}
                                  onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, total_questions: parseInt(e.target.value) || 0 } : null)}
                                />
                              </div>
                              <div>
                                <Label>Time (minutes)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={editMockTestForm.time_minutes}
                                  onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, time_minutes: parseInt(e.target.value) || 0 } : null)}
                                />
                              </div>
                              <div>
                                <Label>Aptitude Questions</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editMockTestForm.aptitude_questions}
                                  onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, aptitude_questions: parseInt(e.target.value) || 0 } : null)}
                                />
                              </div>
                              <div>
                                <Label>Technical Questions</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editMockTestForm.technical_questions}
                                  onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, technical_questions: parseInt(e.target.value) || 0 } : null)}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editMockTestForm.is_active}
                                onCheckedChange={(checked) => setEditMockTestForm(prev => prev ? { ...prev, is_active: checked } : null)}
                              />
                              <Label>Active</Label>
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleUpdateMockTest} disabled={saving} className="flex-1">
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                              </Button>
                              <Button onClick={() => { setEditingMockTestId(null); setEditMockTestForm(null); }} variant="outline" className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{test.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  test.difficulty === 'easy' ? 'bg-success/10 text-success' :
                                  test.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
                                  'bg-destructive/10 text-destructive'
                                }`}>
                                  {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${test.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                  {test.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              {test.description && (
                                <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {test.time_minutes} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Brain className="h-4 w-4" />
                                  {test.aptitude_questions} aptitude
                                </span>
                                <span className="flex items-center gap-1">
                                  <Code className="h-4 w-4" />
                                  {test.technical_questions} technical
                                </span>
                                <span>Total: {test.total_questions} questions</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleMockTestStatus(test.id, test.is_active)}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingMockTestId(test.id);
                                  setEditMockTestForm({ ...test });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteMockTest(test.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mock Test CSV Import Tab */}
          <TabsContent value="import-mock">
            <MockTestCSVImport onRefresh={fetchMockTests} />
          </TabsContent>

          {/* Mock Test Results Tab */}
          <TabsContent value="test-results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Mock Test Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                  <div className="flex-1">
                    <Label>Search by Name, Email, or Test</Label>
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search results..."
                        value={resultsSearchQuery}
                        onChange={(e) => setResultsSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={fetchMockTestResults} 
                      disabled={loadingResults}
                      variant="outline"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {loadingResults ? 'Loading...' : 'Refresh'}
                    </Button>
                    <Button onClick={downloadResultsCSV} disabled={mockTestResults.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                {/* Results Table */}
                {mockTestResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground">User</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Test</th>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Score</th>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Percentage</th>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
                          <th className="text-center py-3 px-4 font-semibold text-foreground">Time</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockTestResults
                          .filter(r =>
                            r.user_email?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
                            r.user_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
                            r.test_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase())
                          )
                          .map((result) => (
                            <tr key={result.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-4">
                                <div>
                                  <p className="font-medium text-foreground">{result.user_name}</p>
                                  <p className="text-xs text-muted-foreground">{result.user_email}</p>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-foreground">{result.test_name}</p>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="font-semibold text-foreground">{result.score}/{result.total_questions}</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`font-semibold ${
                                  result.percentage >= 80 ? 'text-success' :
                                  result.percentage >= 50 ? 'text-warning' :
                                  'text-destructive'
                                }`}>
                                  {result.percentage}%
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  result.passed 
                                    ? 'bg-success/10 text-success' 
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {result.passed ? 'Passed' : 'Failed'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-muted-foreground">
                                  {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-muted-foreground text-xs">
                                  {new Date(result.completed_at).toLocaleDateString()} {new Date(result.completed_at).toLocaleTimeString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty State */}
                {mockTestResults.length === 0 && !loadingResults && (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Click "Refresh" to load mock test results</p>
                  </div>
                )}

                {/* Loading State */}
                {loadingResults && (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading results...</p>
                  </div>
                )}

                {/* No Search Results */}
                {mockTestResults.length > 0 && 
                 mockTestResults.filter(r =>
                   r.user_email?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
                   r.user_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
                   r.test_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase())
                 ).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No results found matching your search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
