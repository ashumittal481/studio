"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useFirebase, useUser } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import TallyCounter from "@/components/TallyCounter";
import ChantController from "@/components/ChantController";
import AudioStyleSelector from "@/components/AudioStyleSelector";
import UserProfile from "@/components/UserProfile";
import { MalaBeadsIcon } from "@/lib/icons";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const MALA_COUNT = 108;

export type AudioSource = "system" | "ai" | "custom";

export default function Home() {
  const [count, setCount] = useState(0);
  const [malas, setMalas] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isChanting, setIsChanting] = useState(false);
  const [chantText, setChantText] = useState("Om");
  const [chantSpeed, setChantSpeed] = useState(50);
  
  const [audioSource, setAudioSource] = useState<AudioSource>("system");
  const [voiceName, setVoiceName] = useState<string>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

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

  const saveSession = useCallback(async () => {
    if (!user || !firestore || !sessionStartTimeRef.current) return;

    const sessionData = {
      userId: user.uid,
      startTime: sessionStartTimeRef.current.toISOString(),
      endTime: new Date().toISOString(),
      totalCount: count + malas * MALA_COUNT,
      malaCount: malas,
      chantText: chantText,
      audioStyle: audioSource,
    };
    
    const collectionPath = `users/${user.uid}/naamJaapSessions`;
    const collectionRef = doc(firestore, collectionPath).parent;

    addDocumentNonBlocking(collectionRef, {
      ...sessionData,
      createdAt: serverTimestamp(),
    });

    sessionStartTimeRef.current = null;
    setCount(0);
    setMalas(0);
  }, [user, firestore, count, malas, chantText, audioSource]);


  const speak = useCallback(
    (text: string) => {
      if (!isChanting && mode !== "auto") return;
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = new Date();
      }

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
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = new Date();
    }
    setCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount >= MALA_COUNT) {
        setMalas((prevMalas) => prevMalas + 1);
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 2000);
        return 0;
      }
      return newCount;
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (sessionStartTimeRef.current && (count > 0 || malas > 0)) {
            e.preventDefault();
            e.returnValue = ''; // For older browsers
            saveSession();
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

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
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isChanting, mode, chantText, chantSpeed, handleIncrement, speak, count, malas, saveSession]);

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

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <MalaBeadsIcon className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md mx-auto">
        <UserProfile />
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
        
        <div className="flex justify-center mt-4">
            <Button onClick={saveSession} disabled={!sessionStartTimeRef.current}>Save Session & Reset</Button>
        </div>
        
        <Separator className="my-8" />
        
        <ChantController
          mode={mode}
          setMode={(newMode) => {
            if(isChanting) saveSession();
            setIsChanting(false);
            setMode(newMode);
          }}
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
