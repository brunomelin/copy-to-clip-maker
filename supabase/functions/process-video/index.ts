import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing video for project:', projectId);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Update status to processing
    await supabase
      .from('video_projects')
      .update({ status: 'processing' })
      .eq('id', projectId);

    console.log('Starting video processing pipeline...');

    // Step 1: Generate audio using ElevenLabs
    console.log('Step 1: Generating audio with ElevenLabs...');
    const audioResponse = await supabase.functions.invoke('generate-audio', {
      body: {
        text: project.script,
        voiceId: project.voice_id || '9BWtsMINqrJLrRacOk9x', // Default: Aria
        language: project.language || 'pt'
      }
    });

    if (audioResponse.error) {
      throw new Error(`Audio generation failed: ${audioResponse.error.message}`);
    }

    const audioPath = audioResponse.data?.audioPath;
    if (!audioPath) {
      throw new Error('Audio generation did not return a valid path');
    }

    console.log('Audio generated successfully:', audioPath);

    // Step 2: Get signed URLs for video and audio
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const { data: videoSignedUrl } = await supabase.storage
      .from('original-videos')
      .createSignedUrl(project.original_video_path.replace('original-videos/', ''), 3600);

    const { data: audioSignedUrl } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(audioPath.replace('audio-files/', ''), 3600);

    if (!videoSignedUrl?.signedUrl || !audioSignedUrl?.signedUrl) {
      throw new Error('Failed to generate signed URLs');
    }

    console.log('Signed URLs generated');

    // Step 3: Call external video processor server
    const processorUrl = Deno.env.get('VIDEO_PROCESSOR_SERVER_URL');
    if (!processorUrl) {
      throw new Error('VIDEO_PROCESSOR_SERVER_URL not configured');
    }

    console.log('Step 2: Calling external video processor...');
    const processorResponse = await fetch(`${processorUrl}/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: videoSignedUrl.signedUrl,
        audioUrl: audioSignedUrl.signedUrl,
        projectId,
        supabaseUrl,
        supabaseKey: serviceRoleKey,
      }),
    });

    if (!processorResponse.ok) {
      const errorText = await processorResponse.text();
      throw new Error(`Video processor failed: ${errorText}`);
    }

    const processorResult = await processorResponse.json();
    console.log('Video processing completed:', processorResult);

    // Step 4: Update project with generated video path
    await supabase
      .from('video_projects')
      .update({ 
        status: 'completed',
        generated_video_path: processorResult.generatedVideoPath
      })
      .eq('id', projectId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Video processing initiated (MVP mode)',
        projectId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-video function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
