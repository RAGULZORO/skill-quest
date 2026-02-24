import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { mockTestId, answers, timeTakenSeconds } = await req.json();

    if (!mockTestId || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mockTestId, answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Separate answers by type
    const aptitudeIds = answers.filter((a: any) => a.type === 'aptitude').map((a: any) => a.questionId);
    const technicalIds = answers.filter((a: any) => a.type === 'technical_mcq').map((a: any) => a.questionId);

    const correctAnswersMap: Record<string, { correctAnswer: number; explanation?: string }> = {};

    if (aptitudeIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('aptitude_questions')
        .select('id, correct_answer, explanation')
        .in('id', aptitudeIds);
      if (error) throw error;
      data?.forEach((q: any) => {
        correctAnswersMap[q.id] = { correctAnswer: q.correct_answer, explanation: q.explanation };
      });
    }

    if (technicalIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('technical_mcq_questions')
        .select('id, correct_answer, explanation')
        .in('id', technicalIds);
      if (error) throw error;
      data?.forEach((q: any) => {
        correctAnswersMap[q.id] = { correctAnswer: q.correct_answer, explanation: q.explanation };
      });
    }

    // Validate each answer
    const results = answers.map((a: any) => {
      const correct = correctAnswersMap[a.questionId];
      if (!correct) return { questionId: a.questionId, isCorrect: false, correctAnswer: -1 };
      const isCorrect = a.selectedAnswer === correct.correctAnswer;
      return {
        questionId: a.questionId,
        isCorrect,
        correctAnswer: correct.correctAnswer,
        explanation: correct.explanation,
      };
    });

    const score = results.filter((r: any) => r.isCorrect).length;
    const totalQuestions = answers.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= 80;

    // Save progress entries
    const progressEntries = answers.map((a: any) => {
      const result = results.find((r: any) => r.questionId === a.questionId);
      return {
        user_id: userId,
        question_id: a.questionId,
        question_type: 'mock_test',
        is_correct: result?.isCorrect ?? false,
        time_spent_seconds: Math.floor((timeTakenSeconds || 0) / totalQuestions),
      };
    });

    await supabaseClient.from('user_progress').insert(progressEntries);

    // Save test result
    await supabaseClient.from('mock_test_results').insert({
      user_id: userId,
      mock_test_id: mockTestId,
      score,
      total_questions: totalQuestions,
      percentage,
      passed,
      time_taken_seconds: timeTakenSeconds || 0,
    });

    return new Response(
      JSON.stringify({ score, totalQuestions, percentage, passed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during validation" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
