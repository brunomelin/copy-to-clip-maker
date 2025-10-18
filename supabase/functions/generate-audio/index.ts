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
    const { text, voiceId, language } = await req.json();
    
    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'Text and voiceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log('Generating audio with ElevenLabs...');

    // Call ElevenLabs API to generate speech
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    // Get audio as blob
    const audioBlob = await response.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Convert to base64
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Get timestamps using Whisper via OpenAI for subtitle synchronization
    // (Optional: This would require OpenAI API key or alternative timestamp generation)
    
    console.log('Audio generated successfully');

    return new Response(
      JSON.stringify({ 
        audioBase64: base64Audio,
        mimeType: 'audio/mpeg'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-audio function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
