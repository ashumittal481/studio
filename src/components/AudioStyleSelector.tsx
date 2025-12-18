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
} from "lucide-react";
import {
  Card,
  CardContent,
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
import { getCustomVoice } from "@/app/actions";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AudioSource } from "@/app/page";
import { cn } from "@/lib/utils";

interface AudioStyleSelectorProps {
  setVoiceName: (voiceName: string) => void;
  setAudioSource: (source: AudioSource) => void;
  setCustomAudioUrl: (url: string | null) => void;
  isChanting: boolean;
}

const formSchema = z.object({
  desiredStyle: z
    .string()
    .min(5, "Please describe the desired voice style in more detail."),
});

const AudioStyleSelector = ({
  setVoiceName,
  setAudioSource,
  setCustomAudioUrl,
  isChanting,
}: AudioStyleSelectorProps) => {
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
        <Tabs defaultValue="ai" className="w-full" onValueChange={(value) => setAudioSource(value as AudioSource)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" disabled={isChanting}><Wand2 className="mr-2 h-4 w-4" />AI Voice</TabsTrigger>
            <TabsTrigger value="record" disabled={isChanting}><Mic className="mr-2 h-4 w-4" />Record</TabsTrigger>
            <TabsTrigger value="upload" disabled={isChanting}><Upload className="mr-2 h-4 w-4" />Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="ai" className="mt-6">
            <AIGeneratorPanel setVoiceName={setVoiceName} setAudioSource={setAudioSource} />
          </TabsContent>
          <TabsContent value="record" className="mt-6">
            <RecordVoicePanel setCustomAudioUrl={setCustomAudioUrl} setAudioSource={setAudioSource} />
          </TabsContent>
          <TabsContent value="upload" className="mt-6">
            <UploadAudioPanel setCustomAudioUrl={setCustomAudioUrl} setAudioSource={setAudioSource} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// AI Generator Panel
const AIGeneratorPanel = ({ setVoiceName, setAudioSource }: { setVoiceName: (name: string) => void, setAudioSource: (source: AudioSource) => void; }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    voiceName: string;
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
      const voice = response.data.voiceConfig.prebuiltVoiceConfig.voiceName;
      setVoiceName(voice);
      setResult({
        voiceName: voice,
        reasoning: response.data.feasibilityReasoning,
      });
      toast({
        title: "Voice Style Updated!",
        description: `Now using voice: ${voice}`,
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
       <p className="text-sm text-muted-foreground">Describe the voice you want the AI to generate.</p>
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
              <strong>New Voice Selected:</strong> {result.voiceName}
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

// Record Voice Panel
const RecordVoicePanel = ({ setCustomAudioUrl, setAudioSource }: { setCustomAudioUrl: (url: string) => void, setAudioSource: (source: AudioSource) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setCustomAudioUrl(url);
        setAudioSource("custom");
        audioChunksRef.current = [];
        toast({ title: "Recording finished.", description: "You can now play your recorded chant." });
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
      {audioURL && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recording Playback</label>
          <audio src={audioURL} controls className="w-full" />
        </div>
      )}
    </div>
  );
};

// Upload Audio Panel
const UploadAudioPanel = ({ setCustomAudioUrl, setAudioSource }: { setCustomAudioUrl: (url: string) => void, setAudioSource: (source: AudioSource) => void }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                setCustomAudioUrl(url);
                setAudioSource("custom");
                setFileName(file.name);
                toast({ title: "Audio file uploaded successfully." });
            } else {
                toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid audio file." });
            }
        }
    };
    
    return (
        <form className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Upload an audio file to use for chanting.</p>
            <div className="space-y-2">
                <label htmlFor="audio-upload" className={cn(
                    "w-full border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50",
                    fileName && "border-primary/50"
                )}>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span>{fileName || "Click or drag to upload"}</span>
                </label>
                <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
            </div>
             {fileName && (
                <Alert>
                    <AlertTitle>File Selected</AlertTitle>
                    <AlertDescription>{fileName}</AlertDescription>
                </Alert>
            )}
        </form>
    );
};


export default AudioStyleSelector;
