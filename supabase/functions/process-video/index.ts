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

    // TODO: Implement actual video processing with FFmpeg or similar
    // For MVP, we'll return a placeholder response
    // In production, you would:
    // 1. Download original video from storage
    // 2. Generate audio using generate-audio function
    // 3. Create subtitles with timestamps
    // 4. Merge audio + subtitles + video using FFmpeg
    // 5. Upload result to storage
    // 6. Update project with generated video path

    console.log('Video processing would happen here');
    console.log('Project details:', { 
      script: project.script,
      voice: project.voice_id,
      language: project.language 
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For MVP, mark as completed
    await supabase
      .from('video_projects')
      .update({ 
        status: 'completed',
        generated_video_path: project.original_video_path // Placeholder
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
