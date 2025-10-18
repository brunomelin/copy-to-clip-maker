import { useCallback } from "react";
import { Upload, Video } from "lucide-react";
import { Card } from "@/components/ui/card";

interface VideoUploadProps {
  onVideoSelect: (file: File | null) => void;
  selectedVideo: File | null;
}

export const VideoUpload = ({ onVideoSelect, selectedVideo }: VideoUploadProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        onVideoSelect(file);
      }
    },
    [onVideoSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoSelect(file);
    }
  };

  return (
    <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="p-8 text-center cursor-pointer group"
        onClick={() => document.getElementById("video-upload")?.click()}
      >
        <input
          type="file"
          id="video-upload"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {selectedVideo ? (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{selectedVideo.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedVideo.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVideoSelect(null);
              }}
              className="text-sm text-primary hover:underline"
            >
              Remover e escolher outro
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Arraste seu vídeo aqui
              </p>
              <p className="text-sm text-muted-foreground">
                ou clique para selecionar
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos: MP4, MOV, AVI • Máx: 100MB
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
