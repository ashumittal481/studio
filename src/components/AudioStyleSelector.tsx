
"use client";

import { useState, useRef, useEffect } from "react";
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

interface ChantState {
  chantText: string;
  audioSource: AudioSource;
  voiceName?: string;
  voiceLang?: string;
  customAudioUrl?: string | null;
}

interface AudioStyleSelectorProps {
  chantState: ChantState;
  setChantState: (state: ChantState) => void;
  isChanting: boolean;
  chantSpeed: number;
  setChantSpeed: (speed: number) => void;
}

const formSchema = z.object({
  desiredStyle: z
    .string()
    .min(5, "Please describe the desired voice style in more detail."),
});

const saveChantState = (state: ChantState) => {
  try {
    const stateToSave = { ...state };
    // We don't save blob URLs as they are temporary
    if (stateToSave.customAudioUrl && stateToSave.customAudioUrl.startsWith('blob:')) {
      // If we have a data URI in local storage, keep it, otherwise clear it.
      const existingStateRaw = localStorage.getItem('lastChantState');
      if (existingStateRaw) {
        const existingState = JSON.parse(existingStateRaw);
        if (existingState.customAudioUrl && !existingState.customAudioUrl.startsWith('blob:')) {
          stateToSave.customAudioUrl = existingState.customAudioUrl;
        } else {
          stateToSave.customAudioUrl = null;
        }
      } else {
        stateToSave.customAudioUrl = null;
      }
    }
    localStorage.setItem('lastChantState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to save chant state to localStorage", error);
  }
};


const AudioStyleSelector = ({
  chantState,
  setChantState,
  isChanting,
  chantSpeed,
  setChantSpeed
}: AudioStyleSelectorProps) => {
  
  const [activeTab, setActiveTab] = useState("library");
  
  // Effect to save state whenever it changes
  useEffect(() => {
    saveChantState(chantState);
  }, [chantState]);


  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'record' || value === 'upload') {
        setChantState({ ...chantState, audioSource: 'custom' });
    }
  }
  const isCustomAudio = chantState.audioSource === 'custom' && (activeTab === 'record' || activeTab === 'upload');

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
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="library" disabled={isChanting}><Sparkles className="mr-2 h-4 w-4" />Library</TabsTrigger>
                            <TabsTrigger value="record" disabled={isChanting}><Mic className="mr-2 h-4 w-4" />Record</TabsTrigger>
                        </TabsList>
                        <TabsContent value="library" className="mt-6">
                            <DefaultChantsPanel 
                                setChantState={setChantState}
                            />
                        </TabsContent>
                        <TabsContent value="ai" className="mt-6">
                             <AIGeneratorPanel setChantState={setChantState} />
                        </TabsContent>
                        <TabsContent value="record" className="mt-6">
                            <RecordVoicePanel setChantState={setChantState} chantState={chantState} />
                        </TabsContent>
                        <TabsContent value="upload" className="mt-6">
                            <UploadAudioPanel setChantState={setChantState} chantState={chantState} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </CollapsibleContent>
    </Collapsible>
  );
};


// Default Chants Panel
const DefaultChantsPanel = ({ 
    setChantState
}: { 
    setChantState: (state: ChantState) => void 
}) => {
    const { toast } = useToast();

    const handleSelectChant = (chant: DefaultChant) => {
        const newState: ChantState = {
            chantText: chant.text,
            audioSource: chant.audioUrl ? "custom" : "ai",
            customAudioUrl: chant.audioUrl || null,
            voiceName: chant.voiceName || undefined,
            voiceLang: chant.lang || 'hi-IN',
        };
        setChantState(newState);

        toast({
            title: "Chant Selected!",
            description: `Now chanting "${chant.text}".`,
        });
    };
    
    return (
        <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">Select a pre-configured chant from the library.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {defaultChants.map((chant) => (
                    <Button key={chant.id} variant="outline" onClick={() => handleSelectChant(chant)} className="justify-start text-left h-auto py-3">
                        <div className="flex flex-col">
                            <span className="font-semibold">{chant?.id==='waheguru'?'ਵਾਹਿਗੁਰੂ': chant.text}</span>
                            <span className="text-xs text-muted-foreground">{chant.description}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

// AI Generator Panel
const AIGeneratorPanel = ({ setChantState }: { setChantState: (state: ChantState) => void }) => {
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
    const response = await getCustomVoice({ desiredStyle: values.desiredStyle });

    if (response.success && response.data) {
      const { voiceName, lang } = response.data.voiceConfig.prebuiltVoiceConfig;
      setChantState(prevState => ({
          ...prevState,
          audioSource: "ai",
          voiceName: voiceName,
          voiceLang: lang,
          customAudioUrl: null,
      }));
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
       <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
                Describe the voice you want the AI to create. For example, "a calm Indian male voice".
            </p>
             <Alert variant="destructive" className="text-left">
                <Music className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                The AI can generate different voice styles, but it cannot add background music.
                </AlertDescription>
            </Alert>
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
                    placeholder="e.g., 'deep, meditative male voice'"
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
const RecordVoicePanel = ({ setChantState, chantState }: { setChantState: (state: ChantState) => void, chantState: ChantState }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setChantState({ ...chantState, chantText: "Transcribing..." });

    try {
      const audioDataUri = await blobToDataURI(audioBlob);
      const response = await getTranscript({ audioDataUri });
      
      const newChantText = (response.success && response.data) ? response.data.transcript : "Om";
      setChantState(prevState => ({
          ...prevState,
          chantText: newChantText,
          audioSource: "custom",
          customAudioUrl: audioDataUri,
          voiceName: undefined
      }));

      if (response.success) {
          toast({ title: "Transcription successful!", description: "The chant text has been updated." });
      } else {
          toast({ variant: "destructive", title: "Transcription Error", description: response.error || "Could not transcribe audio." });
      }

    } catch (error) {
      console.error("Transcription error:", error);
      setChantState(prevState => ({ ...prevState, chantText: "Om" })); // fallback
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
        setAudioURL(url); // For temporary playback
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
        <div className="text-left">
            <p className="text-sm text-muted-foreground">
            Record your own voice for the chant. Your recording will be automatically transcribed to update the chant text.
            </p>
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
const UploadAudioPanel = ({ setChantState, chantState }: { setChantState: (state: ChantState) => void, chantState: ChantState }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcribedText, setTranscribedText] = useState<string | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentStatus, setCurrentStatus] = useState<string>('Click or drag to upload');

    useEffect(() => {
        if (isTranscribing) {
            setCurrentStatus('Transcribing...');
        } else if (fileName) {
            setCurrentStatus(fileName);
        } else {
            setCurrentStatus('Click or drag to upload');
        }
    }, [isTranscribing, fileName]);


    const handleTranscription = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        setTranscribedText(null);
        setChantState({ ...chantState, chantText: "Transcribing..." });
        try {
            const audioDataUri = await blobToDataURI(audioBlob);
            const response = await getTranscript({ audioDataUri });
            
            if (response.success && response.data) {
                const fullText = response.data.transcript;
                setChantState(prevState => ({
                    ...prevState,
                    chantText: fullText,
                    audioSource: "custom",
                    customAudioUrl: audioDataUri,
                    voiceName: undefined
                }));
                setTranscribedText(fullText);
                toast({ title: "Transcription successful!", description: "Chant text has been updated." });
            } else {
                setChantState(prevState => ({ ...prevState, chantText: "Om" })); // fallback
                setTranscribedText("Could not transcribe.");
                toast({ variant: "destructive", title: "Transcription Error", description: response.error || "Could not transcribe audio." });
            }
        } catch (error) {
            setChantState(prevState => ({ ...prevState, chantText: "Om" })); // fallback
            setTranscribedText("An error occurred during transcription.");
            toast({ variant: "destructive", title: "Transcription Error", description: "An unexpected error occurred." });
        } finally {
            setIsTranscribing(false);
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type.startsWith('audio/')) {
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
            <div className="text-left">
                <p className="text-sm text-muted-foreground">
                Upload an audio file for chanting. It will be transcribed to update the chant text.
                </p>
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
                   
                    <span className="text-sm text-muted-foreground truncate max-w-full px-4">{currentStatus}</span>
                </Label>
                <Input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" disabled={isTranscribing} ref={fileInputRef}/>
            </div>
             {transcribedText && !isTranscribing && (
                <Alert>
                    <AlertTitle>Transcription Ready</AlertTitle>
                    <AlertDescription className="truncate">
                        {transcribedText.length > 50 ? `${transcribedText.substring(0, 50)}...` : transcribedText}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};


export default AudioStyleSelector;


    