import express from 'express';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { createWriteStream, unlinkSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Video processor server is running' });
});

// Main video processing endpoint
app.post('/process-video', async (req, res) => {
  const { videoUrl, audioUrl, projectId, supabaseUrl, supabaseKey, script } = req.body;

  if (!videoUrl || !audioUrl || !projectId || !supabaseUrl || !supabaseKey || !script) {
    return res.status(400).json({ 
      error: 'Missing required parameters: videoUrl, audioUrl, projectId, supabaseUrl, supabaseKey, script' 
    });
  }

  const tempId = randomUUID();
  const videoPath = join(tmpdir(), `video-${tempId}.mp4`);
  const audioPath = join(tmpdir(), `audio-${tempId}.mp3`);
  const subtitlePath = join(tmpdir(), `subtitle-${tempId}.ass`);
  const outputPath = join(tmpdir(), `output-${tempId}.mp4`);

  try {
    console.log(`[${projectId}] Starting video processing...`);

    // Download video file
    console.log(`[${projectId}] Downloading video from: ${videoUrl}`);
    await downloadFile(videoUrl, videoPath);

    // Download audio file
    console.log(`[${projectId}] Downloading audio from: ${audioUrl}`);
    await downloadFile(audioUrl, audioPath);

    // Generate subtitle file
    console.log(`[${projectId}] Generating subtitle file...`);
    generateSubtitle(script, subtitlePath);

    // Process video with FFmpeg
    console.log(`[${projectId}] Processing with FFmpeg...`);
    await processWithFFmpeg(videoPath, audioPath, subtitlePath, outputPath);

    // Upload processed video to Supabase Storage
    console.log(`[${projectId}] Uploading processed video to Supabase...`);
    const generatedVideoPath = await uploadToSupabase(
      outputPath,
      projectId,
      supabaseUrl,
      supabaseKey
    );

    // Cleanup temp files
    cleanup([videoPath, audioPath, subtitlePath, outputPath]);

    console.log(`[${projectId}] Processing completed successfully!`);
    res.json({ 
      success: true, 
      generatedVideoPath,
      message: 'Video processed successfully' 
    });

  } catch (error) {
    console.error(`[${projectId}] Error processing video:`, error);
    cleanup([videoPath, audioPath, subtitlePath, outputPath]);
    res.status(500).json({ 
      error: 'Video processing failed', 
      details: error.message 
    });
  }
});

// Helper function to download files
async function downloadFile(url, outputPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const writer = createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Helper function to generate dynamic word-by-word subtitle file (ASS format)
function generateSubtitle(text, outputPath) {
  const words = text.split(' ');
  const secondsPerWord = 0.35; // Duration each word is highlighted
  
  // ASS header with styling similar to the reference image
  let assContent = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,80,&H00FFFFFF,&H000000FF,&H00000000,&HA0008000,-1,0,0,0,100,100,0,0,1,0,0,2,10,10,60,1
Style: Highlight,Arial Black,80,&H00FFFFFF,&H000000FF,&H00000000,&HFF000000,-1,0,0,0,105,105,0,0,1,4,2,2,10,10,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let currentTime = 0;
  const wordsPerLine = 3; // Show 3 words at a time for better visibility
  
  for (let i = 0; i < words.length; i += wordsPerLine) {
    const lineWords = words.slice(i, Math.min(i + wordsPerLine, words.length));
    
    for (let j = 0; j < lineWords.length; j++) {
      const start = formatAssTime(currentTime + (j * secondsPerWord));
      const end = formatAssTime(currentTime + ((j + 1) * secondsPerWord));
      
      // Build the line with highlighted current word
      let text = '';
      for (let k = 0; k < lineWords.length; k++) {
        if (k === j) {
          // Highlight current word with green background effect
          text += `{\\c&H00FFFF&\\3c&H008000&\\bord6\\shad3\\p0\\1a&H40&}${lineWords[k]}{\\r} `;
        } else {
          // Other words with semi-transparent white
          text += `{\\alpha&H60&}${lineWords[k]}{\\r} `;
        }
      }
      
      assContent += `Dialogue: 0,${start},${end},Highlight,,0,0,0,,${text.trim()}\n`;
    }
    
    currentTime += lineWords.length * secondsPerWord;
  }
  
  writeFileSync(outputPath, assContent, 'utf8');
}

// Helper function to format time in ASS format (H:MM:SS.cc)
function formatAssTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);
  
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centisecs).padStart(2, '0')}`;
}

// Helper function to process video with FFmpeg
function processWithFFmpeg(videoPath, audioPath, subtitlePath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v libx264',        // Re-encode video to burn in subtitles
        '-c:a aac',            // Convert audio to AAC
        '-b:a 192k',           // Audio bitrate
        '-map 0:v:0',          // Map video from first input
        '-map 1:a:0',          // Map audio from second input
        '-shortest',           // Finish when shortest input ends
        `-vf subtitles=${subtitlePath}` // Burn in ASS subtitles with advanced styling
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent?.toFixed(2)}% done`);
      })
      .on('end', () => {
        console.log('FFmpeg processing finished');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

// Helper function to upload to Supabase Storage
async function uploadToSupabase(filePath, projectId, supabaseUrl, supabaseKey) {
  const fileBuffer = readFileSync(filePath);
  
  const fileName = `generated-${projectId}-${Date.now()}.mp4`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/generated-videos/${fileName}`;

  const response = await axios.post(uploadUrl, fileBuffer, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'video/mp4',
      'apikey': supabaseKey,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Failed to upload to Supabase: ${response.statusText}`);
  }

  return `generated-videos/${fileName}`;
}

// Helper function to cleanup temp files
function cleanup(filePaths) {
  filePaths.forEach(path => {
    try {
      if (existsSync(path)) {
        unlinkSync(path);
        console.log(`Cleaned up: ${path}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup ${path}:`, error.message);
    }
  });
}

app.listen(PORT, () => {
  console.log(`Video processor server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
