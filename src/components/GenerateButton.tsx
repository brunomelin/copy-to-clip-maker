import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  progress: number;
}

export const GenerateButton = ({
  onClick,
  disabled,
  isGenerating,
  progress,
}: GenerateButtonProps) => {
  return (
    <div className="space-y-4">
      <Button
        onClick={onClick}
        disabled={disabled}
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Gerando Criativo...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Gerar Criativo
          </>
        )}
      </Button>

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Processando: {progress}%
          </p>
        </div>
      )}
    </div>
  );
};
