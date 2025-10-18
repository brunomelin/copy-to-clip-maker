import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string | null;
  isGenerating: boolean;
}

export const VideoPreview = ({ videoUrl, isGenerating }: VideoPreviewProps) => {
  return (
    <Card className="p-6 border-border shadow-card">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-primary" />
          Preview do Vídeo
        </h3>

        <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
                <PlayCircle className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Processando seu vídeo...
              </p>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <PlayCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Seu vídeo aparecerá aqui
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Formato vertical 9:16
              </p>
            </div>
          )}
        </div>

        {videoUrl && (
          <Button className="w-full" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Baixar Vídeo
          </Button>
        )}
      </div>
    </Card>
  );
};
