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
  const subtitlePath = join(tmpdir(), `subtitle-${tempId}.srt`);
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

// Helper function to generate subtitle file
function generateSubtitle(text, outputPath) {
  // Create a simple SRT file with the full text
  // Split text into chunks of approximately 50 characters for better readability
  const words = text.split(' ');
  let chunks = [];
  let currentChunk = '';
  
  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= 50) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  // Estimate timing: assume 150 words per minute (average speaking rate)
  const totalWords = words.length;
  const totalDuration = (totalWords / 150) * 60; // duration in seconds
  const durationPerChunk = totalDuration / chunks.length;
  
  let srtContent = '';
  chunks.forEach((chunk, index) => {
    const startTime = index * durationPerChunk;
    const endTime = (index + 1) * durationPerChunk;
    
    srtContent += `${index + 1}\n`;
    srtContent += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srtContent += `${chunk}\n\n`;
  });
  
  writeFileSync(outputPath, srtContent, 'utf8');
}

// Helper function to format time for SRT
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
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
        `-vf subtitles=${subtitlePath}:force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Bold=1,Alignment=2'` // Burn in subtitles with styling
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
