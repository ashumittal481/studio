"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Settings2,
  Wand2,
  Mic,
  Upload,
  Square,
  Play,
  Pause,
  Loader,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCustomVoice, getTranscript } from "@/app/actions";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AudioSource } from "@/app/page";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface AudioStyleSelectorProps {
  setVoiceName: (voiceName: string) => void;
  setVoiceLang: (lang: string) => void;
  setAudioSource: (source: AudioSource) => void;
  setCustomAudioUrl: (url: string | null) => void;
  isChanting: boolean;
  setChantText: (text: string) => void;
}

const formSchema = z.object({
  desiredStyle: z
    .string()
    .min(5, "Please describe the desired voice style in more detail."),
});

const AudioStyleSelector = ({
  setVoiceName,
  setVoiceLang,
  setAudioSource,
  setCustomAudioUrl,
  isChanting,
  setChantText
}: AudioStyleSelectorProps) => {
  const handleTabChange = (value: string) => {
    const source = value as AudioSource;
    setAudioSource(source);
    if(source === 'system' || source === 'ai') {
        // Reset to default when switching away from custom
        if (source === 'ai') setChantText("राधा");
        else setChantText("Om");
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <div className="text-left">
            <h3 className="font-headline text-xl font-semibold">
              Audio Source
            </h3>
            <p className="text-sm text-muted-foreground">
              Customize the chant voice.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ai" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" disabled={isChanting}><Wand2 className="mr-2 h-4 w-4" />AI Voice</TabsTrigger>
            <TabsTrigger value="record" disabled={isChanting}><Mic className="mr-2 h-4 w-4" />Record</TabsTrigger>
            <TabsTrigger value="upload" disabled={isChanting}><Upload className="mr-2 h-4 w-4" />Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="ai" className="mt-6">
            <AIGeneratorPanel setVoiceName={setVoiceName} setVoiceLang={setVoiceLang} setAudioSource={setAudioSource} />
          </TabsContent>
          <TabsContent value="record" className="mt-6">
            <RecordVoicePanel setCustomAudioUrl={setCustomAudioUrl} setAudioSource={setAudioSource} setChantText={setChantText} />
          </TabsContent>
          <TabsContent value="upload" className="mt-6">
            <UploadAudioPanel setCustomAudioUrl={setCustomAudioUrl} setAudioSource={setAudioSource} setChantText={setChantText} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// AI Generator Panel
const AIGeneratorPanel = ({ setVoiceName, setVoiceLang, setAudioSource }: { setVoiceName: (name: string) => void, setVoiceLang: (lang: string) => void, setAudioSource: (source: AudioSource) => void; }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    voiceName: string;
    lang: string;
    reasoning?: string;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      desiredStyle: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    setAudioSource("ai");
    const response = await getCustomVoice({ desiredStyle: values.desiredStyle });

    if (response.success && response.data) {
      const { voiceName, lang } = response.data.voiceConfig.prebuiltVoiceConfig;
      setVoiceName(voiceName);
      setVoiceLang(lang);
      setResult({
        voiceName: voiceName,
        lang: lang,
        reasoning: response.data.feasibilityReasoning,
      });
      toast({
        title: "Voice Style Updated!",
        description: `Now using voice: ${voiceName}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.error || "Could not generate voice style.",
      });
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
       <p className="text-sm text-muted-foreground">Describe the voice you want the AI to generate. Try "A female voice speaking in Hindi".</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="desiredStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desired Voice Style</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 'a calm Indian female voice'"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Voice
              </>
            )}
          </Button>
        </form>
      </Form>

      {isLoading && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {result && (
        <Alert className="mt-6">
          <Wand2 className="h-4 w-4" />
          <AlertTitle>AI Voice Generation Result</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              <strong>New Voice Selected:</strong> {result.voiceName} ({result.lang})
            </p>
            {result.reasoning && (
              <p>
                <strong>AI Feasibility Note:</strong> {result.reasoning}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};


async function blobToDataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Record Voice Panel
const RecordVoicePanel = ({ setCustomAudioUrl, setAudioSource, setChantText }: { setCustomAudioUrl: (url: string) => void, setAudioSource: (source: AudioSource) => void, setChantText: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setChantText("Transcribing...");

    try {
      const audioDataUri = await blobToDataURI(audioBlob);
      const response = await getTranscript({ audioDataUri });
      
      if (response.success && response.data) {
        setChantText(response.data.transcript);
        toast({ title: "Transcription successful!", description: "The chant text has been updated." });
      } else {
        setChantText("Om"); // fallback
        toast({ variant: "destructive", title: "Transcription Error", description: response.error || "Could not transcribe audio." });
      }

    } catch (error) {
      console.error("Transcription error:", error);
      setChantText("Om"); // fallback
      toast({ variant: "destructive", title: "Transcription Error", description: "An unexpected error occurred." });
    } finally {
      setIsTranscribing(false);
    }
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setCustomAudioUrl(url);
        setAudioSource("custom");
        audioChunksRef.current = [];
        toast({ title: "Recording finished.", description: "Transcribing your chant now..." });
        handleTranscription(audioBlob);
      };
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: "Recording started..." });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({ variant: "destructive", title: "Recording Error", description: "Could not start recording. Please ensure microphone permissions are granted." });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
       // Stop all media tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-4 text-center">
       <p className="text-sm text-muted-foreground">Record your own voice for the chant.</p>
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        className="w-full"
        variant={isRecording ? "destructive" : "default"}
        disabled={isTranscribing}
      >
        {isRecording ? (
          <>
            <Square className="mr-2 h-4 w-4" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Recording
          </>
        )}
      </Button>
      {isTranscribing && (
        <div className="flex items-center justify-center space-x-2">
            <Loader className="h-4 w-4 animate-spin"/>
            <p className="text-sm text-muted-foreground">Transcribing audio...</p>
        </div>
      )}
      {audioURL && (
        <div className="space-y-2">
          <Label>Recording Playback</Label>
          <audio src={audioURL} controls className="w-full" />
        </div>
      )}
    </div>
  );
};

// Upload Audio Panel
const UploadAudioPanel = ({ setCustomAudioUrl, setAudioSource, setChantText }: { setCustomAudioUrl: (url: string) => void, setAudioSource: (source: AudioSource) => void, setChantText: (text: string) => void }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const { toast } = useToast();

    const handleTranscription = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        setChantText("Transcribing...");
        try {
            const audioDataUri = await blobToDataURI(audioBlob);
            const response = await getTranscript({ audioDataUri });
            
            if (response.success && response.data) {
                setChantText(response.data.transcript);
                toast({ title: "Transcription successful!", description: "The chant text has been updated." });
            } else {
                 setChantText("Om"); // fallback
                toast({ variant: "destructive", title: "Transcription Error", description: response.error || "Could not transcribe audio." });
            }
        } catch (error) {
            console.error("Transcription error:", error);
            setChantText("Om"); // fallback
            toast({ variant: "destructive", title: "Transcription Error", description: "An unexpected error occurred." });
        } finally {
            setIsTranscribing(false);
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                setCustomAudioUrl(url);
                setAudioSource("custom");
                setFileName(file.name);
                toast({ title: "Audio file uploaded. Transcribing..." });
                handleTranscription(file);
            } else {
                toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid audio file." });
            }
        }
    };
    
    return (
        <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Upload an audio file to use for chanting.</p>
            <div className="space-y-2">
                <label htmlFor="audio-upload" className={cn(
                    "w-full border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50",
                    fileName && "border-primary/50",
                    (isTranscribing) && "pointer-events-none opacity-50"
                )}>
                    {isTranscribing ? (
                         <Loader className="h-8 w-8 text-muted-foreground mb-2 animate-spin"/>
                    ) : (
                         <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    )}
                   
                    <span>{isTranscribing ? 'Transcribing...' : (fileName || "Click or drag to upload")}</span>
                </label>
                <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" disabled={isTranscribing} />
            </div>
             {fileName && !isTranscribing && (
                <Alert>
                    <AlertTitle>File Selected</AlertTitle>
                    <AlertDescription>{fileName}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};


export default AudioStyleSelector;
