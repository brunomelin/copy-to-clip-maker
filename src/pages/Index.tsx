import { useState } from "react";
import { VideoUpload } from "@/components/VideoUpload";
import { ScriptInput } from "@/components/ScriptInput";
import { VoiceSettings } from "@/components/VoiceSettings";
import { VideoPreview } from "@/components/VideoPreview";
import { GenerateButton } from "@/components/GenerateButton";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [voice, setVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerate = async () => {
    if (!videoFile || !script) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    // Simulação de progresso (será substituído pela implementação real)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 500);
    
    // TODO: Implementar integração com backend
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setIsGenerating(false);
      // setGeneratedVideo(url);
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CreativeFactory AI
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Intro */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Crie Vídeos Verticais com IA
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Gere automaticamente vídeos com narração profissional e legendas sincronizadas
              para suas redes sociais e campanhas publicitárias.
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              <VideoUpload 
                onVideoSelect={setVideoFile}
                selectedVideo={videoFile}
              />
              
              <ScriptInput 
                value={script}
                onChange={setScript}
              />
              
              <VoiceSettings
                language={language}
                voice={voice}
                onLanguageChange={setLanguage}
                onVoiceChange={setVoice}
              />
              
              <GenerateButton
                onClick={handleGenerate}
                disabled={!videoFile || !script || isGenerating}
                isGenerating={isGenerating}
                progress={progress}
              />
            </div>

            {/* Right Column - Preview */}
            <div className="lg:sticky lg:top-24 h-fit">
              <VideoPreview
                videoUrl={generatedVideo}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CreativeFactory AI - Transforme suas ideias em vídeos profissionais</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
