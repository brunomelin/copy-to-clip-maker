import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { VideoUpload } from "@/components/VideoUpload";
import { ScriptInput } from "@/components/ScriptInput";
import { VoiceSettings } from "@/components/VoiceSettings";
import { VideoPreview } from "@/components/VideoPreview";
import { GenerateButton } from "@/components/GenerateButton";
import { Auth } from "@/components/Auth";
import { Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [voice, setVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
  };

  const handleGenerate = async () => {
    if (!videoFile || !script || !user) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      // Upload video to storage
      const fileName = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('original-videos')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      setProgress(30);

      // Create project in database
      const { data: project, error: projectError } = await supabase
        .from('video_projects')
        .insert({
          user_id: user.id,
          title: `Vídeo ${new Date().toLocaleDateString()}`,
          script,
          language,
          voice_id: voice,
          original_video_path: fileName,
          status: 'pending'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      setProgress(60);

      // Call process-video edge function
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-video',
        {
          body: { projectId: project.id }
        }
      );

      if (processError) throw processError;

      setProgress(90);
      
      // Get the updated project with generated video path
      const { data: updatedProject, error: fetchError } = await supabase
        .from('video_projects')
        .select('generated_video_path')
        .eq('id', project.id)
        .single();

      if (fetchError) throw fetchError;

      // Get public URL for the generated video
      if (updatedProject.generated_video_path) {
        const { data: urlData } = supabase.storage
          .from('original-videos')
          .getPublicUrl(updatedProject.generated_video_path);
        
        setGeneratedVideo(urlData.publicUrl);
      }

      setProgress(100);
      toast.success("Vídeo gerado com sucesso!");

    } catch (error: any) {
      console.error('Error generating video:', error);
      toast.error(error.message || "Erro ao gerar vídeo");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                CreativeFactory AI
              </h1>
            </div>
            
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
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
