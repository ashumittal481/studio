
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Wand2,
  Mic,
  Upload,
  Square,
  Sparkles,
  ChevronDown,
  Music,
} from "lucide-react";
import {
  Card,
  CardContent,
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
import { defaultChants, DefaultChant } from "@/lib/default-chants";
import { Loader } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Slider } from "./ui/slider";

interface AudioStyleSelectorProps {
  setVoiceName: (voiceName: string) => void;
  setVoiceLang: (lang: string) => void;
  audioSource: AudioSource;
  setAudioSource: (source: AudioSource) => void;
  setCustomAudioUrl: (url: string | null) => void;
  isChanting: boolean;
  setChantText: (text: string) => void;
  chantSpeed: number;
  setChantSpeed: (speed: number) => void;
}

const formSchema = z.object({
  desiredStyle: z
    .string()
    .min(5, "Please describe the desired voice style in more detail."),
});

const AudioStyleSelector = ({
  setVoiceName,
  setVoiceLang,
  audioSource,
  setAudioSource,
  setCustomAudioUrl,
  isChanting,
  setChantText,
  chantSpeed,
  setChantSpeed
}: AudioStyleSelectorProps) => {
  const handleTabChange = (value: string) => {
    const sourceTab = value as 'ai' | 'record' | 'upload' | 'defaults';
    if (sourceTab === 'ai' || sourceTab === 'defaults') {
        setAudioSource('ai');
    } else {
        setAudioSource('custom');
    }
  }
  const isCustomAudio = audioSource === 'custom';

  return (
    <Collapsible className="w-full">
        <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between shadow-md">
                Chant & Audio Settings
                <ChevronDown className="h-4 w-4" />
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <Card className="shadow-md mt-2">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="chant-text">Chant Text</Label>
                        <Input
                            id="chant-text"
                            value={chantText}
                            onChange={(e) => setChantText(e.target.value)}
                            disabled={isChanting || isCustomAudio}
                            placeholder={isCustomAudio ? "Plays uploaded/recorded audio" : "e.g. Om"}
                        />
                        {isCustomAudio && <p className="text-xs text-muted-foreground">Chant text is based on the audio transcription.</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="chant-speed">Chant Speed</Label>
                        <Slider
                            id="chant-speed"
                            min={0}
                            max={100}
                            step={1}
                            value={[chantSpeed]}
                            onValueChange={(value) => setChantSpeed(value[0])}
                            disabled={isChanting}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Slower</span>
                            <span>Faster</span>
                        </div>
                    </div>
                    <Tabs defaultValue="defaults" className="w-full" onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="defaults" disabled={isChanting}><Sparkles className="mr-2 h-4 w-4" />Defaults</TabsTrigger>
                            <TabsTrigger value="ai" disabled={isChanting}><Wand2 className="mr-2 h-4 w-4" />AI Voice</TabsTrigger>
                            <TabsTrigger value="record" disabled={isChanting}><Mic className="mr-2 h-4 w-4" />Record</TabsTrigger>
                            <TabsTrigger value="upload" disabled={isChanting}><Upload className="mr-2 h-4 w-4" />Upload</TabsTrigger>
                        </TabsList>
                        <TabsContent value="defaults" className="mt-6">
                            <DefaultChantsPanel setChantText={setChantText} setVoiceName={setVoiceName} setVoiceLang={setVoiceLang} />
                        </TabsContent>
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
        </CollapsibleContent>
    </Collapsible>
  );
};


// Default Chants Panel
const DefaultChantsPanel = ({ setChantText, setVoiceName, setVoiceLang }: { setChantText: (text: string) => void, setVoiceName: (name: string) => void, setVoiceLang: (lang: string) => void }) => {
    const { toast } = useToast();

    const handleSelectChant = (chant: DefaultChant) => {
        setChantText(chant.text);
        setVoiceName(chant.voiceName);
        setVoiceLang(chant.lang);
        toast({
            title: "Chant Selected!",
            description: `Now chanting "${chant.text}".`,
        });
    };
    
    return (
        <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">Select a pre-configured chant.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {defaultChants.map((chant) => (
                    <Button key={chant.id} variant="outline" onClick={() => handleSelectChant(chant)} className="justify-start text-left h-auto py-3">
                        <div className="flex flex-col">
                            <span className="font-semibold">{chant.text}</span>
                            <span className="text-xs text-muted-foreground">{chant.description}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

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
       <div className="flex items-center gap-3">
            <Wand2 className="h-6 w-6 text-primary" />
            <div className="text-left">
                <h3 className="font-semibold">
                Generate AI Voice
                </h3>
                <p className="text-sm text-muted-foreground">
                Describe the voice you want the AI to create.
                </p>
            </div>
        </div>
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
                    placeholder="e.g., 'a calm Indian male voice'"
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
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
        toast({
            variant: "destructive",
            title: "Unsupported Feature",
            description: "Audio recording is not supported on this browser or device.",
        });
        return;
    }
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
    } catch (err: any) {
      console.error("Error starting recording:", err);
      if (err.name === 'NotAllowedError') {
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "Microphone access was denied. Please check your browser/device settings to allow microphone access for this app.",
          duration: 9000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Recording Error",
          description: `Could not start recording: ${err.message}`,
        });
      }
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
        <div className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <div className="text-left">
                <h3 className="font-semibold">
                Record Voice
                </h3>
                <p className="text-sm text-muted-foreground">
                Record your own voice for the chant.
                </p>
            </div>
        </div>
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            // console.error("Transcription error:", error);
            setChantText("Untrack word"); // fallback
            // toast({ variant: "destructive", title: "Transcription Error", description: "An unexpected error occurred." });
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
            <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-primary" />
                <div className="text-left">
                    <h3 className="font-semibold">
                    Upload Audio
                    </h3>
                    <p className="text-sm text-muted-foreground">
                    Upload an audio file to use for chanting.
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                 <Label htmlFor="audio-upload" className={cn(
                    "w-full border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors",
                    fileName && "border-primary/50",
                    (isTranscribing) && "pointer-events-none opacity-50"
                )}>
                    {isTranscribing ? (
                         <Loader className="h-8 w-8 text-muted-foreground mb-2 animate-spin"/>
                    ) : (
                         <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    )}
                   
                    <span className="text-sm text-muted-foreground">{isTranscribing ? 'Transcribing...' : (fileName || "Click or drag to upload")}</span>
                </Label>
                <Input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" disabled={isTranscribing} ref={fileInputRef}/>
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
