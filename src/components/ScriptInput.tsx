import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface ScriptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const ScriptInput = ({ value, onChange }: ScriptInputProps) => {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  return (
    <Card className="p-6 border-border shadow-card hover:shadow-lg transition-all duration-300">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <Label htmlFor="script" className="text-lg font-semibold">
              Copy do Vídeo
            </Label>
            <p className="text-sm text-muted-foreground">
              Escreva o texto que será narrado
            </p>
          </div>
        </div>

        <Textarea
          id="script"
          placeholder="Ex: Descubra como economizar tempo e gerar vídeos incríveis com inteligência artificial. Nossa ferramenta transforma suas ideias em criações profissionais em minutos!"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-none text-base leading-relaxed"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{wordCount} palavras</span>
          <span>{charCount} caracteres</span>
        </div>
      </div>
    </Card>
  );
};
