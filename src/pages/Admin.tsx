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
  const [progressCategory, setProgressCategory] = useState<'all' | 'aptitude' | 'technical' | 'coding' | 'gd'>('all');

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
      const { data: allProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id');

      if (progressError || !allProgress) {
        console.error('Error fetching progress:', progressError);
        setLoadingProgress(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(allProgress.map((p: any) => p.user_id))];

      // Fetch user details from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError || !profiles) {
        console.error('Error fetching profiles:', profilesError);
        setLoadingProgress(false);
        return;
      }

      // Fetch progress for each user
      const userProgressList = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: aptitudeProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('question_type', 'aptitude');

          const { data: technicalProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('question_type', 'technical');

          const { data: gdProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('question_type', 'gd');

          const { data: codingProgress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('question_type', 'coding');

          const aptitudeCorrect = aptitudeProgress?.filter((p: any) => p.is_correct).length || 0;
          const technicalCorrect = technicalProgress?.filter((p: any) => p.is_correct).length || 0;
          const gdCorrect = gdProgress?.filter((p: any) => p.is_correct).length || 0;
          const codingCorrect = codingProgress?.filter((p: any) => p.is_correct).length || 0;

          const aptitudeAccuracy = aptitudeProgress && aptitudeProgress.length > 0
            ? Math.round((aptitudeCorrect / aptitudeProgress.length) * 100) : 0;
          const technicalAccuracy = technicalProgress && technicalProgress.length > 0
            ? Math.round((technicalCorrect / technicalProgress.length) * 100) : 0;
          const gdAccuracy = gdProgress && gdProgress.length > 0
            ? Math.round((gdCorrect / gdProgress.length) * 100) : 0;
          const codingAccuracy = codingProgress && codingProgress.length > 0
            ? Math.round((codingCorrect / codingProgress.length) * 100) : 0;

          return {
            id: profile.user_id,
            email: profile.email || 'Unknown',
            name: profile.full_name || profile.email || 'Unknown User',
            aptitude: { attempted: aptitudeProgress?.length || 0, correct: aptitudeCorrect, accuracy: aptitudeAccuracy },
            technical: { attempted: technicalProgress?.length || 0, correct: technicalCorrect, accuracy: technicalAccuracy },
            gd: { attempted: gdProgress?.length || 0, correct: gdCorrect, accuracy: gdAccuracy },
            coding: { attempted: codingProgress?.length || 0, correct: codingCorrect, accuracy: codingAccuracy },
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

  const [activeSection, setActiveSection] = useState('aptitude');
  const [activeSubTab, setActiveSubTab] = useState('add');

  const navSections = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'aptitude', label: 'Aptitude', icon: Brain },
    { id: 'technical', label: 'Technical MCQ', icon: Code },
    { id: 'coding', label: 'Coding', icon: Terminal },
    { id: 'gd', label: 'GD Topics', icon: Users },
    { id: 'mock-tests', label: 'Mock Tests', icon: ClipboardList },
    { id: 'test-results', label: 'Test Results', icon: Trophy },
    { id: 'progress', label: 'User Progress', icon: TrendingUp },
  ];

  const totalQuestions = Object.values(aptitudeQuestionCounts).reduce((a, b) => a + b, 0)
    + Object.values(technicalQuestionCounts).reduce((a, b) => a + b, 0)
    + Object.values(codingQuestionCounts).reduce((a, b) => a + b, 0)
    + Object.values(gdQuestionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Admin Panel</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage questions, tests & analytics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden w-full border-b border-border bg-card overflow-x-auto">
        <div className="flex px-2 py-2 gap-1">
          {navSections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'gd') {
                  window.location.href = '/admin/gd';
                  return;
                }
                setActiveSection(id);
                setActiveSubTab('add');
                if (id === 'mock-tests') fetchMockTests();
                if (id === 'test-results') fetchMockTestResults();
                if (id === 'progress') fetchUserProgress();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeSection === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Sidebar Navigation */}
        <aside className="w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-57px)] sticky top-[57px] hidden md:block">
          <nav className="py-4 px-3 space-y-1">
            {navSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  if (id === 'gd') {
                    window.location.href = '/admin/gd';
                    return;
                  }
                  setActiveSection(id);
                  setActiveSubTab('add');
                  if (id === 'mock-tests') fetchMockTests();
                  if (id === 'test-results') fetchMockTestResults();
                  if (id === 'progress') fetchUserProgress();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-6">

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Dashboard Overview</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Aptitude', count: Object.values(aptitudeQuestionCounts).reduce((a, b) => a + b, 0), icon: Brain, color: 'text-primary' },
                  { label: 'Technical', count: Object.values(technicalQuestionCounts).reduce((a, b) => a + b, 0), icon: Code, color: 'text-primary' },
                  { label: 'Coding', count: Object.values(codingQuestionCounts).reduce((a, b) => a + b, 0), icon: Terminal, color: 'text-warning' },
                  { label: 'GD Topics', count: Object.values(gdQuestionCounts).reduce((a, b) => a + b, 0), icon: Users, color: 'text-success' },
                ].map(({ label, count, icon: Icon, color }) => (
                  <Card key={label} className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`h-5 w-5 ${color}`} />
                        <span className="text-2xl font-bold text-foreground">{count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{label} Questions</p>
                      <div className="mt-3 grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map(level => {
                          const counts = label === 'Aptitude' ? aptitudeQuestionCounts : label === 'Technical' ? technicalQuestionCounts : label === 'Coding' ? codingQuestionCounts : gdQuestionCounts;
                          return (
                            <div key={level} className="text-center">
                              <div className="text-xs font-semibold text-foreground">{counts[level] || 0}</div>
                              <div className="text-[10px] text-muted-foreground">L{level}</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border border-border">
                <CardContent className="p-6 text-center">
                  <p className="text-3xl font-bold text-foreground">{totalQuestions}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Questions in Database</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Aptitude Section */}
          {activeSection === 'aptitude' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" /> Aptitude Questions
                </h2>
              </div>
              <div className="flex gap-1 border-b border-border pb-px">
                {[
                  { id: 'add', label: 'Add New' },
                  { id: 'manage', label: 'Manage' },
                  { id: 'import', label: 'CSV Import' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveSubTab(tab.id);
                      if (tab.id === 'manage') fetchAllAptitudeQuestions();
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                      activeSubTab === tab.id
                        ? 'bg-card text-foreground border border-border border-b-card -mb-px'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSubTab === 'add' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Add Aptitude Question</CardTitle>
                  </CardHeader>
                  {/* Question Count Status */}
                  <CardContent className="pb-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      {[1, 2, 3, 4].map((level) => {
                        const count = aptitudeQuestionCounts[level] || 0;
                        const isFull = count >= 20;
                        const levelName = level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Expert';
                        return (
                          <div key={level} className={`p-3 rounded-lg border text-center transition-all ${isFull ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}>
                            <p className="text-xs text-muted-foreground">{levelName}</p>
                            <p className={`text-lg font-bold ${isFull ? 'text-success' : 'text-foreground'}`}>{count}/20</p>
                          </div>
                        );
                      })}
                    </div>

                    {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 && (
                      <Alert className="border-destructive/50 bg-destructive/5 mb-4">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive ml-2 text-sm">
                          Level {aptitudeForm.level} is full. Select a different level.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium">Category</Label>
                          <Select value={aptitudeForm.category} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Quantitative">Quantitative</SelectItem>
                              <SelectItem value="Logical Reasoning">Logical Reasoning</SelectItem>
                              <SelectItem value="Verbal Ability">Verbal Ability</SelectItem>
                              <SelectItem value="Data Interpretation">Data Interpretation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Level</Label>
                          <Select value={aptitudeForm.level.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, level: parseInt(v) }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Level 1 - Beginner</SelectItem>
                              <SelectItem value="2">Level 2 - Intermediate</SelectItem>
                              <SelectItem value="3">Level 3 - Advanced</SelectItem>
                              <SelectItem value="4">Level 4 - Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Question</Label>
                        <Textarea value={aptitudeForm.question} onChange={(e) => setAptitudeForm(prev => ({ ...prev, question: e.target.value }))} placeholder="Enter your question..." rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Options</Label>
                        {aptitudeForm.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">{String.fromCharCode(65 + index)}</span>
                            <Input value={option} onChange={(e) => { const newOpts = [...aptitudeForm.options]; newOpts[index] = e.target.value; setAptitudeForm(prev => ({ ...prev, options: newOpts })); }} placeholder={`Option ${String.fromCharCode(65 + index)}`} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Correct Answer</Label>
                        <Select value={aptitudeForm.correctAnswer.toString()} onValueChange={(v) => setAptitudeForm(prev => ({ ...prev, correctAnswer: parseInt(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {aptitudeForm.options.map((_, index) => (<SelectItem key={index} value={index.toString()}>Option {String.fromCharCode(65 + index)}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Explanation</Label>
                        <Textarea value={aptitudeForm.explanation} onChange={(e) => setAptitudeForm(prev => ({ ...prev, explanation: e.target.value }))} placeholder="Explain why this is the correct answer..." rows={3} />
                      </div>
                      <Button onClick={handleAptitudeSubmit} disabled={saving || (aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {(aptitudeQuestionCounts[aptitudeForm.level] || 0) >= 20 ? 'Level Full' : saving ? 'Saving...' : 'Save Question'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'manage' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Manage Aptitude Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allAptitudeQuestions.length === 0 && !loadingQuestions ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">No questions loaded yet.</p>
                        <Button onClick={fetchAllAptitudeQuestions} size="sm">Load Questions</Button>
                      </div>
                    ) : loadingQuestions ? (
                      <div className="text-center py-8">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Loading...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{allAptitudeQuestions.length} questions</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={toggleAllAptitude}>
                              {selectedAptitudeIds.size === allAptitudeQuestions.length ? <><CheckSquare className="h-3 w-3 mr-1" /> Deselect</> : <><Square className="h-3 w-3 mr-1" /> Select All</>}
                            </Button>
                            {selectedAptitudeIds.size > 0 && (
                              <Button variant="destructive" size="sm" disabled={bulkDeleting} onClick={handleBulkDeleteAptitude}>
                                <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedAptitudeIds.size})
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={fetchAllAptitudeQuestions}>Refresh</Button>
                          </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto space-y-2">
                          {allAptitudeQuestions.map((q) => (
                            <div key={q.id} className={`border rounded-lg p-3 transition-colors ${selectedAptitudeIds.has(q.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              {editingAptitudeId === q.id && editAptitudeForm ? (
                                <div className="space-y-3">
                                  <Textarea value={editAptitudeForm.question} onChange={(e) => setEditAptitudeForm((prev: any) => ({ ...prev, question: e.target.value }))} rows={2} />
                                  {editAptitudeForm.options.map((opt: string, i: number) => (
                                    <Input key={i} value={opt} onChange={(e) => { const newOpts = [...editAptitudeForm.options]; newOpts[i] = e.target.value; setEditAptitudeForm((prev: any) => ({ ...prev, options: newOpts })); }} placeholder={`Option ${i+1}`} />
                                  ))}
                                  <Select value={editAptitudeForm.correct_answer.toString()} onValueChange={(v) => setEditAptitudeForm((prev: any) => ({ ...prev, correct_answer: parseInt(v) }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{editAptitudeForm.options.map((_: string, i: number) => (<SelectItem key={i} value={i.toString()}>Option {i + 1}</SelectItem>))}</SelectContent>
                                  </Select>
                                  <Textarea value={editAptitudeForm.explanation} onChange={(e) => setEditAptitudeForm((prev: any) => ({ ...prev, explanation: e.target.value }))} rows={2} />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleUpdateAptitude} disabled={saving}><Save className="h-3 w-3 mr-1" /> Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setEditingAptitudeId(null); setEditAptitudeForm(null); }}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <button onClick={() => toggleAptitudeSelection(q.id)} className="mt-0.5 shrink-0">
                                    {selectedAptitudeIds.has(q.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.question}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">L{q.level} · {q.category}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingAptitudeId(q.id); setEditAptitudeForm({ ...q, options: Array.isArray(q.options) ? q.options : [] }); }}><Edit className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteAptitude(q.id)}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'import' && (
                <CSVImport type="aptitude" onCountsUpdated={fetchAptitudeQuestionCounts} />
              )}
            </div>
          )}

          {/* Technical Section */}
          {activeSection === 'technical' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" /> Technical MCQ
              </h2>
              <div className="flex gap-1 border-b border-border pb-px">
                {[{ id: 'add', label: 'Add New' }, { id: 'manage', label: 'Manage' }, { id: 'import', label: 'CSV Import' }].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); if (tab.id === 'manage') fetchAllTechnicalQuestions(); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeSubTab === tab.id ? 'bg-card text-foreground border border-border border-b-card -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>
                ))}
              </div>

              {activeSubTab === 'add' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4"><CardTitle className="text-base">Add Technical MCQ</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((level) => {
                        const count = technicalQuestionCounts[level] || 0;
                        const isFull = count >= 20;
                        return (
                          <div key={level} className={`p-3 rounded-lg border text-center ${isFull ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}>
                            <p className="text-xs text-muted-foreground">Level {level}</p>
                            <p className={`text-lg font-bold ${isFull ? 'text-success' : 'text-foreground'}`}>{count}/20</p>
                          </div>
                        );
                      })}
                    </div>
                    {(technicalQuestionCounts[technicalForm.level] || 0) >= 20 && (
                      <Alert className="border-destructive/50 bg-destructive/5">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive ml-2 text-sm">Level {technicalForm.level} is full.</AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Category</Label>
                        <Select value={technicalForm.category} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Programming">Programming</SelectItem>
                            <SelectItem value="Data Structures">Data Structures</SelectItem>
                            <SelectItem value="DBMS">DBMS</SelectItem>
                            <SelectItem value="OS">Operating Systems</SelectItem>
                            <SelectItem value="Networking">Networking</SelectItem>
                            <SelectItem value="OOP">OOP Concepts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Level</Label>
                        <Select value={technicalForm.level.toString()} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, level: parseInt(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Label className="text-xs font-medium">Question</Label>
                      <Textarea value={technicalForm.question} onChange={(e) => setTechnicalForm(prev => ({ ...prev, question: e.target.value }))} placeholder="Enter question..." rows={3} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {technicalForm.options.map((option, index) => (
                        <div key={index}>
                          <Label className="text-xs font-medium">Option {String.fromCharCode(65 + index)}</Label>
                          <Input value={option} onChange={(e) => { const newOpts = [...technicalForm.options]; newOpts[index] = e.target.value; setTechnicalForm(prev => ({ ...prev, options: newOpts })); }} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Correct Answer</Label>
                      <Select value={technicalForm.correctAnswer.toString()} onValueChange={(v) => setTechnicalForm(prev => ({ ...prev, correctAnswer: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{technicalForm.options.map((_, index) => (<SelectItem key={index} value={index.toString()}>Option {String.fromCharCode(65 + index)}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Explanation</Label>
                      <Textarea value={technicalForm.explanation} onChange={(e) => setTechnicalForm(prev => ({ ...prev, explanation: e.target.value }))} placeholder="Explain..." rows={3} />
                    </div>
                    <Button onClick={handleTechnicalSubmit} disabled={saving || (technicalQuestionCounts[technicalForm.level] || 0) >= 20} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {(technicalQuestionCounts[technicalForm.level] || 0) >= 20 ? 'Level Full' : saving ? 'Saving...' : 'Save Technical MCQ'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'manage' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4"><CardTitle className="text-base">Manage Technical Questions</CardTitle></CardHeader>
                  <CardContent>
                    {allTechnicalQuestions.length === 0 && !loadingQuestions ? (
                      <div className="text-center py-8"><p className="text-sm text-muted-foreground mb-3">No questions loaded.</p><Button onClick={fetchAllTechnicalQuestions} size="sm">Load Questions</Button></div>
                    ) : loadingQuestions ? (
                      <div className="text-center py-8"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" /><p className="text-xs text-muted-foreground">Loading...</p></div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{allTechnicalQuestions.length} questions</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={toggleAllTechnical}>{selectedTechnicalIds.size === allTechnicalQuestions.length ? <><CheckSquare className="h-3 w-3 mr-1" /> Deselect</> : <><Square className="h-3 w-3 mr-1" /> Select All</>}</Button>
                            {selectedTechnicalIds.size > 0 && (<Button variant="destructive" size="sm" disabled={bulkDeleting} onClick={handleBulkDeleteTechnical}><Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedTechnicalIds.size})</Button>)}
                            <Button variant="outline" size="sm" onClick={fetchAllTechnicalQuestions}>Refresh</Button>
                          </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto space-y-2">
                          {allTechnicalQuestions.map((q) => (
                            <div key={q.id} className={`border rounded-lg p-3 transition-colors ${selectedTechnicalIds.has(q.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              {editingTechnicalId === q.id && editTechnicalForm ? (
                                <div className="space-y-3">
                                  <Textarea value={editTechnicalForm.question} onChange={(e) => setEditTechnicalForm((prev: any) => ({ ...prev, question: e.target.value }))} rows={2} />
                                  {editTechnicalForm.options.map((opt: string, i: number) => (<Input key={i} value={opt} onChange={(e) => { const newOpts = [...editTechnicalForm.options]; newOpts[i] = e.target.value; setEditTechnicalForm((prev: any) => ({ ...prev, options: newOpts })); }} />))}
                                  <Select value={editTechnicalForm.correct_answer.toString()} onValueChange={(v) => setEditTechnicalForm((prev: any) => ({ ...prev, correct_answer: parseInt(v) }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{editTechnicalForm.options.map((_: string, i: number) => (<SelectItem key={i} value={i.toString()}>Option {i+1}</SelectItem>))}</SelectContent>
                                  </Select>
                                  <Textarea value={editTechnicalForm.explanation} onChange={(e) => setEditTechnicalForm((prev: any) => ({ ...prev, explanation: e.target.value }))} rows={2} />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleUpdateTechnical} disabled={saving}><Save className="h-3 w-3 mr-1" /> Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => { setEditingTechnicalId(null); setEditTechnicalForm(null); }}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <button onClick={() => toggleTechnicalSelection(q.id)} className="mt-0.5 shrink-0">
                                    {selectedTechnicalIds.has(q.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.question}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">L{q.level} · {q.category}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingTechnicalId(q.id); setEditTechnicalForm({ ...q, options: Array.isArray(q.options) ? q.options : [] }); }}><Edit className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTechnical(q.id)}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'import' && (<CSVImport type="technical" onCountsUpdated={fetchTechnicalQuestionCounts} />)}
            </div>
          )}

          {/* Coding Section */}
          {activeSection === 'coding' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5 text-warning" /> Coding Questions
              </h2>
              <div className="flex gap-1 border-b border-border pb-px">
                {[{ id: 'add', label: 'Add New' }, { id: 'manage', label: 'Manage' }, { id: 'import', label: 'CSV Import' }].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); if (tab.id === 'manage') fetchAllCodingQuestions(); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeSubTab === tab.id ? 'bg-card text-foreground border border-border border-b-card -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>
                ))}
              </div>

              {activeSubTab === 'add' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4"><CardTitle className="text-base">Add Coding Question</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((level) => {
                        const count = codingQuestionCounts[level] || 0;
                        const isFull = count >= 20;
                        return (
                          <div key={level} className={`p-3 rounded-lg border text-center ${isFull ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}>
                            <p className="text-xs text-muted-foreground">Level {level}</p>
                            <p className={`text-lg font-bold ${isFull ? 'text-success' : 'text-foreground'}`}>{count}/20</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Category</Label>
                        <Select value={codingForm.category} onValueChange={(v) => setCodingForm(prev => ({ ...prev, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Arrays">Arrays</SelectItem>
                            <SelectItem value="Strings">Strings</SelectItem>
                            <SelectItem value="Linked Lists">Linked Lists</SelectItem>
                            <SelectItem value="Trees">Trees</SelectItem>
                            <SelectItem value="Graphs">Graphs</SelectItem>
                            <SelectItem value="Dynamic Programming">DP</SelectItem>
                            <SelectItem value="Recursion">Recursion</SelectItem>
                            <SelectItem value="Sorting">Sorting</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Difficulty</Label>
                        <Select value={codingForm.difficulty} onValueChange={(v) => setCodingForm(prev => ({ ...prev, difficulty: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Level</Label>
                        <Select value={codingForm.level.toString()} onValueChange={(v) => setCodingForm(prev => ({ ...prev, level: parseInt(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Label className="text-xs font-medium">Title</Label>
                      <Input value={codingForm.title} onChange={(e) => setCodingForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Question title" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Description</Label>
                      <Textarea value={codingForm.description} onChange={(e) => setCodingForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Problem description..." rows={4} />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Examples</Label>
                      {codingForm.examples.map((ex, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 mt-2">
                          <Input value={ex.input} onChange={(e) => { const newEx = [...codingForm.examples]; newEx[i] = { ...newEx[i], input: e.target.value }; setCodingForm(prev => ({ ...prev, examples: newEx })); }} placeholder="Input" />
                          <Input value={ex.output} onChange={(e) => { const newEx = [...codingForm.examples]; newEx[i] = { ...newEx[i], output: e.target.value }; setCodingForm(prev => ({ ...prev, examples: newEx })); }} placeholder="Output" />
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setCodingForm(prev => ({ ...prev, examples: [...prev.examples, { input: '', output: '' }] }))}>
                        <Plus className="h-3 w-3 mr-1" /> Add Example
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Approach</Label>
                      <Textarea value={codingForm.approach} onChange={(e) => setCodingForm(prev => ({ ...prev, approach: e.target.value }))} placeholder="Approach..." rows={3} />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Solution Code</Label>
                      <Textarea value={codingForm.solution} onChange={(e) => setCodingForm(prev => ({ ...prev, solution: e.target.value }))} placeholder="Solution code..." rows={6} className="font-mono text-sm" />
                    </div>
                    <Button onClick={handleCodingSubmit} disabled={saving || (codingQuestionCounts[codingForm.level] || 0) >= 20} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {(codingQuestionCounts[codingForm.level] || 0) >= 20 ? 'Level Full' : saving ? 'Saving...' : 'Save Coding Question'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'manage' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4"><CardTitle className="text-base">Manage Coding Questions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button onClick={fetchAllCodingQuestions} variant="outline" size="sm">{loadingQuestions ? 'Loading...' : 'Load Questions'}</Button>
                      {allCodingQuestions.length > 0 && (
                        <>
                          <Button onClick={toggleAllCoding} variant="outline" size="sm">
                            {selectedCodingIds.size === allCodingQuestions.length ? <><CheckSquare className="h-3 w-3 mr-1" /> Deselect</> : <><Square className="h-3 w-3 mr-1" /> Select All</>}
                          </Button>
                          {selectedCodingIds.size > 0 && (
                            <Button onClick={handleBulkDeleteCoding} variant="destructive" size="sm" disabled={bulkDeleting}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedCodingIds.size})
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {allCodingQuestions.map((q: any) => (
                        <div key={q.id} className={`p-3 border rounded-lg ${selectedCodingIds.has(q.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          {editingCodingId === q.id ? (
                            <div className="space-y-3">
                              <Input value={editCodingForm?.title} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, title: e.target.value }))} placeholder="Title" />
                              <Textarea value={editCodingForm?.description} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, description: e.target.value }))} rows={2} />
                              <div className="grid grid-cols-3 gap-2">
                                <Select value={editCodingForm?.category} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, category: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {['Arrays','Strings','Linked Lists','Trees','Graphs','Dynamic Programming','Recursion','Sorting'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Select value={editCodingForm?.difficulty} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, difficulty: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{['Easy','Medium','Hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={editCodingForm?.level?.toString()} onValueChange={(v) => setEditCodingForm((prev: any) => ({ ...prev, level: parseInt(v) }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{[1,2,3,4].map(l => <SelectItem key={l} value={l.toString()}>Level {l}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <Textarea value={editCodingForm?.approach} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, approach: e.target.value }))} rows={2} placeholder="Approach" />
                              <Textarea value={editCodingForm?.solution} onChange={(e) => setEditCodingForm((prev: any) => ({ ...prev, solution: e.target.value }))} rows={3} className="font-mono text-sm" placeholder="Solution" />
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateCoding} disabled={saving} size="sm">Save</Button>
                                <Button onClick={() => { setEditingCodingId(null); setEditCodingForm(null); }} variant="outline" size="sm">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <button onClick={() => toggleCodingSelection(q.id)} className="mt-0.5 shrink-0">
                                {selectedCodingIds.has(q.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{q.title}</p>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{q.category}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${q.difficulty === 'Easy' ? 'bg-success/10 text-success' : q.difficulty === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{q.difficulty}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">L{q.level}</span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingCodingId(q.id); setEditCodingForm({ ...q }); }}><Edit className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteCoding(q.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'import' && (<CSVImport type="coding" onCountsUpdated={fetchCodingQuestionCounts} />)}
            </div>
          )}

          {/* Mock Tests Section */}
          {activeSection === 'mock-tests' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Mock Tests
              </h2>
              <div className="flex gap-1 border-b border-border pb-px">
                {[{ id: 'add', label: 'Create New' }, { id: 'manage', label: 'Manage' }, { id: 'import', label: 'CSV Import' }].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); if (tab.id === 'manage') fetchMockTests(); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeSubTab === tab.id ? 'bg-card text-foreground border border-border border-b-card -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>
                ))}
              </div>

              {activeSubTab === 'add' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4"><CardTitle className="text-base">Create Mock Test</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="text-xs font-medium">Test Name *</Label><Input value={mockTestForm.name} onChange={(e) => setMockTestForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Final Assessment" /></div>
                      <div>
                        <Label className="text-xs font-medium">Difficulty</Label>
                        <Select value={mockTestForm.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setMockTestForm(prev => ({ ...prev, difficulty: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-xs font-medium">Description</Label><Textarea value={mockTestForm.description} onChange={(e) => setMockTestForm(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><Label className="text-xs font-medium">Total Questions</Label><Input type="number" min={1} value={mockTestForm.total_questions} onChange={(e) => setMockTestForm(prev => ({ ...prev, total_questions: parseInt(e.target.value) || 0 }))} /></div>
                      <div><Label className="text-xs font-medium">Time (min)</Label><Input type="number" min={1} value={mockTestForm.time_minutes} onChange={(e) => setMockTestForm(prev => ({ ...prev, time_minutes: parseInt(e.target.value) || 0 }))} /></div>
                      <div><Label className="text-xs font-medium">Aptitude Qs</Label><Input type="number" min={0} value={mockTestForm.aptitude_questions} onChange={(e) => setMockTestForm(prev => ({ ...prev, aptitude_questions: parseInt(e.target.value) || 0 }))} /></div>
                      <div><Label className="text-xs font-medium">Technical Qs</Label><Input type="number" min={0} value={mockTestForm.technical_questions} onChange={(e) => setMockTestForm(prev => ({ ...prev, technical_questions: parseInt(e.target.value) || 0 }))} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={mockTestForm.is_active} onCheckedChange={(checked) => setMockTestForm(prev => ({ ...prev, is_active: checked }))} />
                      <Label className="text-xs">Active (visible to users)</Label>
                    </div>
                    <Button onClick={handleMockTestSubmit} disabled={saving} className="w-full"><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Create Mock Test'}</Button>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'manage' && (
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Manage Mock Tests</CardTitle>
                      <Button onClick={fetchMockTests} variant="outline" size="sm">{loadingMockTests ? 'Loading...' : 'Refresh'}</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {mockTests.length === 0 && !loadingMockTests && (
                      <div className="text-center py-8"><ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm text-muted-foreground">No mock tests yet</p></div>
                    )}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {mockTests.map((test) => (
                        <div key={test.id} className="p-4 border border-border rounded-lg">
                          {editingMockTestId === test.id && editMockTestForm ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <Input value={editMockTestForm.name} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, name: e.target.value } : null)} placeholder="Name" />
                                <Select value={editMockTestForm.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setEditMockTestForm(prev => prev ? { ...prev, difficulty: v } : null)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                                </Select>
                              </div>
                              <Textarea value={editMockTestForm.description || ''} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, description: e.target.value } : null)} rows={2} />
                              <div className="grid grid-cols-4 gap-2">
                                <Input type="number" min={1} value={editMockTestForm.total_questions} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, total_questions: parseInt(e.target.value) || 0 } : null)} />
                                <Input type="number" min={1} value={editMockTestForm.time_minutes} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, time_minutes: parseInt(e.target.value) || 0 } : null)} />
                                <Input type="number" min={0} value={editMockTestForm.aptitude_questions} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, aptitude_questions: parseInt(e.target.value) || 0 } : null)} />
                                <Input type="number" min={0} value={editMockTestForm.technical_questions} onChange={(e) => setEditMockTestForm(prev => prev ? { ...prev, technical_questions: parseInt(e.target.value) || 0 } : null)} />
                              </div>
                              <div className="flex items-center gap-2"><Switch checked={editMockTestForm.is_active} onCheckedChange={(checked) => setEditMockTestForm(prev => prev ? { ...prev, is_active: checked } : null)} /><Label className="text-xs">Active</Label></div>
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateMockTest} disabled={saving} size="sm"><Save className="h-3 w-3 mr-1" /> Save</Button>
                                <Button onClick={() => { setEditingMockTestId(null); setEditMockTestForm(null); }} variant="outline" size="sm">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-foreground">{test.name}</h3>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${test.difficulty === 'easy' ? 'bg-success/10 text-success' : test.difficulty === 'medium' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{test.difficulty}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${test.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{test.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>{test.time_minutes}m</span>
                                  <span>{test.aptitude_questions} apt</span>
                                  <span>{test.technical_questions} tech</span>
                                  <span>{test.total_questions} total</span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleMockTestStatus(test.id, test.is_active)}><Power className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingMockTestId(test.id); setEditMockTestForm({ ...test }); }}><Edit className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteMockTest(test.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSubTab === 'import' && (<MockTestCSVImport onRefresh={fetchMockTests} />)}
            </div>
          )}

          {/* Test Results Section */}
          {activeSection === 'test-results' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" /> Mock Test Results
              </h2>
              <Card className="border border-border">
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input placeholder="Search by name, email, or test..." value={resultsSearchQuery} onChange={(e) => setResultsSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={fetchMockTestResults} disabled={loadingResults} variant="outline" size="sm">{loadingResults ? 'Loading...' : 'Refresh'}</Button>
                      <Button onClick={downloadResultsCSV} disabled={mockTestResults.length === 0} size="sm"><Download className="h-3 w-3 mr-1" /> CSV</Button>
                    </div>
                  </div>

                  {loadingResults && (<div className="text-center py-8"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" /><p className="text-xs text-muted-foreground">Loading...</p></div>)}

                  {!loadingResults && mockTestResults.length === 0 && (
                    <div className="text-center py-8"><Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm text-muted-foreground">Click Refresh to load results</p></div>
                  )}

                  {mockTestResults.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Test</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">%</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockTestResults
                            .filter(r => r.user_email?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) || r.user_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) || r.test_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()))
                            .map((result) => (
                              <tr key={result.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="py-3 px-3"><p className="text-sm font-medium text-foreground">{result.user_name}</p><p className="text-[10px] text-muted-foreground">{result.user_email}</p></td>
                                <td className="py-3 px-3 text-sm text-foreground">{result.test_name}</td>
                                <td className="py-3 px-3 text-center text-sm font-semibold text-foreground">{result.score}/{result.total_questions}</td>
                                <td className="py-3 px-3 text-center"><span className={`text-sm font-bold ${result.percentage >= 80 ? 'text-success' : result.percentage >= 50 ? 'text-warning' : 'text-destructive'}`}>{result.percentage}%</span></td>
                                <td className="py-3 px-3 text-center"><span className={`text-[10px] px-2 py-0.5 rounded font-medium ${result.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{result.passed ? 'Pass' : 'Fail'}</span></td>
                                <td className="py-3 px-3 text-center text-xs text-muted-foreground">{Math.floor(result.time_taken_seconds / 60)}m</td>
                                <td className="py-3 px-3 text-xs text-muted-foreground">{new Date(result.completed_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Progress Section */}
          {activeSection === 'progress' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> User Progress
              </h2>
              <Card className="border border-border">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 relative">
                      <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={progressCategory} onValueChange={(v: any) => setProgressCategory(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="aptitude">Aptitude</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="gd">GD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={fetchUserProgress} disabled={loadingProgress} className="flex-1">
                      <TrendingUp className="h-4 w-4 mr-2" />{loadingProgress ? 'Loading...' : 'Load Progress'}
                    </Button>
                    {userProgressData.length > 0 && (
                      <Button variant="outline" onClick={() => {
                        const headers = ['Name', 'Email', 'Aptitude Attempted', 'Aptitude Correct', 'Aptitude Accuracy %', 'Technical Attempted', 'Technical Correct', 'Technical Accuracy %', 'Coding Attempted', 'Coding Correct', 'Coding Accuracy %', 'GD Attempted', 'GD Correct', 'GD Accuracy %'];
                        const rows = userProgressData.map((u: any) => [u.name, u.email, u.aptitude.attempted, u.aptitude.correct, u.aptitude.accuracy, u.technical.attempted, u.technical.correct, u.technical.accuracy, u.coding.attempted, u.coding.correct, u.coding.accuracy, u.gd.attempted, u.gd.correct, u.gd.accuracy].map(v => `"${v}"`).join(','));
                        const csv = [headers.join(','), ...rows].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `user_progress_${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <Download className="h-4 w-4 mr-2" /> CSV
                      </Button>
                    )}
                  </div>

                  {loadingProgress && (<div className="text-center py-8"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" /><p className="text-xs text-muted-foreground">Loading...</p></div>)}

                  {!loadingProgress && userProgressData.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                            {(progressCategory === 'all' || progressCategory === 'aptitude') && <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aptitude</th>}
                            {(progressCategory === 'all' || progressCategory === 'technical') && <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Technical</th>}
                            {(progressCategory === 'all' || progressCategory === 'coding') && <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coding</th>}
                            {(progressCategory === 'all' || progressCategory === 'gd') && <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">GD</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {userProgressData.filter(user => user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.name.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
                            <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-3"><p className="text-sm font-medium text-foreground">{user.name}</p><p className="text-[10px] text-muted-foreground">{user.email}</p></td>
                              {(progressCategory === 'all' || progressCategory === 'aptitude') && (
                                <td className="py-3 px-3 text-center">
                                  <p className="text-sm font-bold text-foreground">{user.aptitude.correct}/{user.aptitude.attempted}</p>
                                  <div className="w-16 h-1 bg-muted rounded-full mx-auto mt-1"><div className="h-full bg-primary rounded-full" style={{ width: `${user.aptitude.accuracy}%` }} /></div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.aptitude.accuracy}%</p>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'technical') && (
                                <td className="py-3 px-3 text-center">
                                  <p className="text-sm font-bold text-foreground">{user.technical.correct}/{user.technical.attempted}</p>
                                  <div className="w-16 h-1 bg-muted rounded-full mx-auto mt-1"><div className="h-full bg-primary rounded-full" style={{ width: `${user.technical.accuracy}%` }} /></div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.technical.accuracy}%</p>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'coding') && (
                                <td className="py-3 px-3 text-center">
                                  <p className="text-sm font-bold text-foreground">{user.coding.correct}/{user.coding.attempted}</p>
                                  <div className="w-16 h-1 bg-muted rounded-full mx-auto mt-1"><div className="h-full bg-warning rounded-full" style={{ width: `${user.coding.accuracy}%` }} /></div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.coding.accuracy}%</p>
                                </td>
                              )}
                              {(progressCategory === 'all' || progressCategory === 'gd') && (
                                <td className="py-3 px-3 text-center">
                                  <p className="text-sm font-bold text-foreground">{user.gd.correct}/{user.gd.attempted}</p>
                                  <div className="w-16 h-1 bg-muted rounded-full mx-auto mt-1"><div className="h-full bg-success rounded-full" style={{ width: `${user.gd.accuracy}%` }} /></div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.gd.accuracy}%</p>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Admin;
