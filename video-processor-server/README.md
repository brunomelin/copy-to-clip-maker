# Video Processor Server

Servidor Node.js com FFmpeg para processar vídeos do CreativeFactory AI.

## Funcionalidades

- Substitui áudio original por áudio gerado via ElevenLabs
- Processa vídeos usando FFmpeg
- Upload automático para Supabase Storage
- Suporte para hospedagem em Railway, Render, DigitalOcean

## Instalação Local

```bash
# Instalar dependências
npm install

# Verificar se FFmpeg está instalado
ffmpeg -version

# Iniciar servidor
npm start
```

## Deploy

### Railway

1. Crie uma conta em [Railway](https://railway.app)
2. Conecte seu repositório Git
3. Railway detectará automaticamente o Dockerfile
4. Defina a variável de ambiente `PORT` (Railway configura automaticamente)
5. Deploy será feito automaticamente

### Render

1. Crie uma conta em [Render](https://render.com)
2. Criar novo Web Service
3. Conecte seu repositório
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Docker`
5. Adicione variáveis de ambiente se necessário

### DigitalOcean App Platform

1. Crie uma conta em [DigitalOcean](https://www.digitalocean.com)
2. Vá para App Platform
3. Conecte seu repositório
4. Configure Dockerfile deployment
5. Deploy

## Variáveis de Ambiente

```
PORT=3000              # Porta do servidor (automática no Railway/Render)
NODE_ENV=production    # Ambiente de produção
```

## API Endpoints

### Health Check
```
GET /health
```

### Process Video
```
POST /process-video

Body:
{
  "videoUrl": "https://...",      // URL do vídeo original
  "audioUrl": "https://...",      // URL do áudio gerado
  "projectId": "uuid",            // ID do projeto
  "supabaseUrl": "https://...",   // URL do Supabase
  "supabaseKey": "..."            // Service Role Key do Supabase
}

Response:
{
  "success": true,
  "generatedVideoPath": "generated-videos/...",
  "message": "Video processed successfully"
}
```

## Teste Local

```bash
curl http://localhost:3000/health
```

## Logs

O servidor registra todas as operações:
- Download de arquivos
- Progresso do FFmpeg
- Upload para Supabase
- Erros e cleanup

## Recursos Necessários

- **CPU**: 1-2 cores (processamento de vídeo)
- **RAM**: 1-2 GB mínimo
- **Disco**: 500MB-1GB (arquivos temporários)
- **FFmpeg**: Instalado automaticamente via Dockerfile
