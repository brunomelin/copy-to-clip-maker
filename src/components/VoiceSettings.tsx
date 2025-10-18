import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Mic } from "lucide-react";

interface VoiceSettingsProps {
  language: string;
  voice: string;
  onLanguageChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
}

const languages = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "es-ES", label: "Espanhol (Espanha)" },
  { value: "en-US", label: "Inglês (EUA)" },
  { value: "fr-FR", label: "Francês" },
  { value: "de-DE", label: "Alemão" },
];

const voices = [
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (Feminina - Natural)" },
  { value: "9BWtsMINqrJLrRacOk9x", label: "Aria (Feminina - Expressiva)" },
  { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily (Feminina - Amigável)" },
  { value: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (Masculina - Profissional)" },
  { value: "nPczCjzI2devNBz1zQrb", label: "Brian (Masculina - Natural)" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (Masculina - Confiante)" },
];

export const VoiceSettings = ({
  language,
  voice,
  onLanguageChange,
  onVoiceChange,
}: VoiceSettingsProps) => {
  return (
    <Card className="p-6 border-border shadow-card hover:shadow-lg transition-all duration-300">
      <div className="space-y-6">
        <div>
          <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Configurações de Voz
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm font-medium">
            Idioma
          </Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice" className="text-sm font-medium flex items-center gap-2">
            <Mic className="w-4 h-4 text-accent" />
            Voz IA (ElevenLabs)
          </Label>
          <Select value={voice} onValueChange={onVoiceChange}>
            <SelectTrigger id="voice" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
