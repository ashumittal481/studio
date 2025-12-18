"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TallyCounter from "@/components/TallyCounter";
import ChantController from "@/components/ChantController";
import AudioStyleSelector from "@/components/AudioStyleSelector";
import { MalaBeadsIcon } from "@/lib/icons";
import { Separator } from "@/components/ui/separator";
import ChantAnimator from "@/components/ChantAnimator";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, collection, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { Loader, User as UserIcon } from "lucide-react";
import Link from "next/link";

const MALA_COUNT = 108;

export type AudioSource = "ai" | "custom";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [count, setCount] = useState(0);
  const [malas, setMalas] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isChanting, setIsChanting] = useState(false);
  const [chantText, setChantText] = useState("राधा");
  const [chantSpeed, setChantSpeed] = useState(50);
  
  const [audioSource, setAudioSource] = useState<AudioSource>("ai");
  const [voiceName, setVoiceName] = useState<string>("hi-IN-Wavenet-A");
  const [voiceLang, setVoiceLang] = useState<string>("hi-IN");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  
  const [chantAnimationKey, setChantAnimationKey] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && !isDataLoaded) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCount(data.count || 0);
          setMalas(data.malas || 0);
        }
        setIsDataLoaded(true);
      });
      return () => unsubscribe();
    }
  }, [user, isDataLoaded]);

  const saveData = useCallback(async (newCount: number, newMalas: number) => {
    if (user && !isSavingRef.current) {
      isSavingRef.current = true;
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { count: newCount, malas: newMalas, uid: user.uid }, { merge: true });
      } catch (error) {
        console.error("Error saving user data:", error);
      } finally {
        isSavingRef.current = false;
      }
    }
  }, [user]);

  const updateDailyMalaCount = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const dailyStatDocRef = doc(db, `users/${user.uid}/daily_stats`, today);

    try {
      const docSnap = await getDoc(dailyStatDocRef);
      if (docSnap.exists()) {
        await updateDoc(dailyStatDocRef, {
          malaCount: increment(1),
        });
      } else {
        await setDoc(dailyStatDocRef, {
          malaCount: 1,
          date: today,
        });
      }
    } catch (error) {
        console.error("Error updating daily mala count:", error);
    }
  }, [user]);

  useEffect(() => {
    audioRef.current = new Audio();
  }, []);
  
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isChanting && mode !== "auto") return;

      if (audioSource === 'custom' && customAudioUrl && audioRef.current) {
        audioRef.current.src = customAudioUrl;
        audioRef.current.play().catch(console.error);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceLang) {
          utterance.lang = voiceLang;
        }
        if (voiceName) {
          const selectedVoice = voices.find((v) => v.name === voiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        window.speechSynthesis.speak(utterance);
      }
    },
    [voiceName, voiceLang, voices, isChanting, mode, audioSource, customAudioUrl]
  );
  
  const handleIncrement = useCallback(() => {
    setChantAnimationKey(prev => prev + 1);
    setCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount >= MALA_COUNT) {
        const newMalas = malas + 1;
        setMalas(newMalas);
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 2000);
        saveData(0, newMalas);
        updateDailyMalaCount(); // Update daily count here
        return 0;
      } else {
        saveData(newCount, malas);
        return newCount;
      }
    });
  }, [malas, saveData, updateDailyMalaCount]);

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
      speak(chantText);
      handleIncrement();
    }
  };

  const handleAutoToggle = () => {
    if (mode === "auto") {
      setIsChanting((prev) => !prev);
    }
  };
  
  const handleSignOut = async () => {
    await auth.signOut();
    router.push("/login");
  };

  if (loading || !user || !isDataLoaded) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your Sadhana...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md mx-auto">
        <header className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="w-full flex justify-between items-center">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile">
                  <UserIcon />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
              <MalaBeadsIcon className="h-12 w-12 text-primary mb-2" />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
            </div>
            <h1 className="font-headline text-4xl font-bold text-foreground">
              Naam Jaap Sadhana
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {user.email}!
            </p>
        </header>

        <div className="relative">
          <TallyCounter count={count} malas={malas} isCelebrating={isCelebrating} />
          <ChantAnimator text={chantText} animationKey={chantAnimationKey} />
        </div>
        
        <Separator className="my-8" />
        
        <ChantController
          mode={mode}
          setMode={(newMode) => {
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
          setVoiceLang={setVoiceLang}
          setAudioSource={setAudioSource}
          setCustomAudioUrl={setCustomAudioUrl}
          isChanting={isChanting}
          setChantText={setChantText}
        />
      </div>

       <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naam Jaap Sadhana. All rights reserved.</p>
      </footer>
    </main>
  );
}
