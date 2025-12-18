
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TallyCounter from "@/components/TallyCounter";
import ChantController from "@/components/ChantController";
import AudioStyleSelector from "@/components/AudioStyleSelector";
import UserProfile from "@/components/UserProfile";
import { MalaBeadsIcon } from "@/lib/icons";
import { Separator } from "@/components/ui/separator";

const MALA_COUNT = 108;

export type AudioSource = "ai" | "record" | "upload" | "custom";

export default function Home() {
  const [count, setCount] = useState(0);
  const [malas, setMalas] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isChanting, setIsChanting] = useState(false);
  const [chantText, setChantText] = useState("Om");
  const [chantSpeed, setChantSpeed] = useState(50);
  
  const [audioSource, setAudioSource] = useState<AudioSource>("ai");
  const [voiceName, setVoiceName] = useState<string>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
  }, []);
  
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        if(!voiceName) {
            const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
            if(defaultVoice) setVoiceName(defaultVoice.name);
        }
      }
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceName]);


  const speak = useCallback(
    (text: string) => {
      if (!isChanting && mode !== "auto") return;

      if (audioSource === 'custom' && customAudioUrl && audioRef.current) {
        audioRef.current.src = customAudioUrl;
        audioRef.current.play().catch(console.error);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceName) {
          const selectedVoice = voices.find((v) => v.name === voiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        window.speechSynthesis.speak(utterance);
      }
    },
    [voiceName, voices, isChanting, mode, audioSource, customAudioUrl]
  );

  const handleIncrement = useCallback(() => {
    setCount((prevCount) => {
      if (prevCount === MALA_COUNT) {
        setMalas((prevMalas) => prevMalas + 1);
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 2000);
        return 1;
      }
      return prevCount + 1;
    });
  }, []);

  useEffect(() => {
    if (mode === "auto" && isChanting) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const intervalDuration = (100 - chantSpeed) * 40 + 1000;
      intervalRef.current = setInterval(() => {
        speak(chantText);
        handleIncrement();
      }, intervalDuration);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isChanting, mode, chantText, chantSpeed, handleIncrement, speak]);

  const handleManualTap = () => {
    if (mode === "manual") {
      handleIncrement();
    }
  };

  const handleAutoToggle = () => {
    if (mode === "auto") {
      setIsChanting((prev) => !prev);
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 sm:p-6 md:p-8">
      <UserProfile />
      <div className="w-full max-w-md mx-auto">
        <header className="flex flex-col items-center justify-center my-6 text-center">
            <MalaBeadsIcon className="h-12 w-12 text-primary mb-2" />
            <h1 className="font-headline text-4xl font-bold text-foreground">
              Naam Jaap Sadhana
            </h1>
            <p className="text-muted-foreground mt-1">
              Your modern tool for sacred chanting.
            </p>
        </header>
        
        <TallyCounter count={count} malas={malas} isCelebrating={isCelebrating} />
                
        <Separator className="my-8" />
        
        <ChantController
          mode={mode}
          setMode={setMode}
          onManualTap={handleManualTap}
          onAutoToggle={handleAutoToggle}
          isAutoChanting={isChanting}
          chantText={chantText}
          setChantText={setChantText}
          chantSpeed={chantSpeed}
          setChantSpeed={setChantSpeed}
          audioSource={audioSource}
        />
        
        <Separator className="my-8" />

        <AudioStyleSelector 
          setVoiceName={setVoiceName}
          setAudioSource={setAudioSource}
          setCustomAudioUrl={setCustomAudioUrl}
          isChanting={isChanting}
        />
      </div>

       <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naam Jaap Sadhana. All rights reserved.</p>
      </footer>
    </main>
  );
}
