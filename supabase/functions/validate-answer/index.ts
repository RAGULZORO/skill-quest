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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
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
      console.error('Authentication failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Validating answer for user:', userId);

    const { questionId, questionType, selectedAnswer } = await req.json();

    if (!questionId || !questionType || selectedAnswer === undefined || selectedAnswer === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionId, questionType, selectedAnswer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to query the correct answer (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let tableName: string;
    if (questionType === 'aptitude') {
      tableName = 'aptitude_questions';
    } else if (questionType === 'technical_mcq') {
      tableName = 'technical_mcq_questions';
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid question type. Must be "aptitude" or "technical_mcq"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: question, error: queryError } = await supabaseAdmin
      .from(tableName)
      .select('id, correct_answer, explanation')
      .eq('id', questionId)
      .single();

    if (queryError || !question) {
      console.error('Question not found:', queryError?.message);
      return new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isCorrect = question.correct_answer === selectedAnswer;

    console.log(`Answer validation: questionId=${questionId}, selected=${selectedAnswer}, correct=${question.correct_answer}, isCorrect=${isCorrect}`);

    return new Response(
      JSON.stringify({
        isCorrect,
        correctAnswer: question.correct_answer,
        explanation: question.explanation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
