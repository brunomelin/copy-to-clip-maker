import express from 'express';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
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
  const { videoUrl, audioUrl, projectId, supabaseUrl, supabaseKey } = req.body;

  if (!videoUrl || !audioUrl || !projectId || !supabaseUrl || !supabaseKey) {
    return res.status(400).json({ 
      error: 'Missing required parameters: videoUrl, audioUrl, projectId, supabaseUrl, supabaseKey' 
    });
  }

  const tempId = randomUUID();
  const videoPath = join(tmpdir(), `video-${tempId}.mp4`);
  const audioPath = join(tmpdir(), `audio-${tempId}.mp3`);
  const outputPath = join(tmpdir(), `output-${tempId}.mp4`);

  try {
    console.log(`[${projectId}] Starting video processing...`);

    // Download video file
    console.log(`[${projectId}] Downloading video from: ${videoUrl}`);
    await downloadFile(videoUrl, videoPath);

    // Download audio file
    console.log(`[${projectId}] Downloading audio from: ${audioUrl}`);
    await downloadFile(audioUrl, audioPath);

    // Process video with FFmpeg
    console.log(`[${projectId}] Processing with FFmpeg...`);
    await processWithFFmpeg(videoPath, audioPath, outputPath);

    // Upload processed video to Supabase Storage
    console.log(`[${projectId}] Uploading processed video to Supabase...`);
    const generatedVideoPath = await uploadToSupabase(
      outputPath,
      projectId,
      supabaseUrl,
      supabaseKey
    );

    // Cleanup temp files
    cleanup([videoPath, audioPath, outputPath]);

    console.log(`[${projectId}] Processing completed successfully!`);
    res.json({ 
      success: true, 
      generatedVideoPath,
      message: 'Video processed successfully' 
    });

  } catch (error) {
    console.error(`[${projectId}] Error processing video:`, error);
    cleanup([videoPath, audioPath, outputPath]);
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

// Helper function to process video with FFmpeg
function processWithFFmpeg(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',           // Copy video codec (no re-encoding)
        '-c:a aac',            // Convert audio to AAC
        '-b:a 192k',           // Audio bitrate
        '-map 0:v:0',          // Map video from first input
        '-map 1:a:0',          // Map audio from second input
        '-shortest',           // Finish when shortest input ends
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
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  
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
