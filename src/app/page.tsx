
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ChantController from "@/components/ChantController";
import AudioStyleSelector from "@/components/AudioStyleSelector";
import { LogOut, Settings, BarChart, Calendar, Repeat, Clock, HelpCircle, User as UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, setDoc, getDoc, collection, updateDoc, increment, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PeacockIcon, MalaBeadsIcon } from "@/lib/icons";

const MALA_COUNT = 108;
export type AudioSource = "ai" | "custom";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [count, setCount] = useState(0);
  const [malas, setMalas] = useState(0);
  const [todaysJapa, setTodaysJapa] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isChanting, setIsChanting] = useState(false);
  const [chantText, setChantText] = useState("राधा राधा");
  const [chantSpeed, setChantSpeed] = useState(50);
  
  const [audioSource, setAudioSource] = useState<AudioSource>("custom");
  const [voiceName, setVoiceName] = useState<string | undefined>('hi-IN-Wavenet-D');
  const [voiceLang, setVoiceLang] = useState<string>("hi-IN");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>("/audio/Gausalla Street 2.m4a");
  
  const [chantAnimationKey, setChantAnimationKey] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSavingRef = useRef(false);
  const lastMalaIncrementTime = useRef<number>(0);

  const [sessionTime, setSessionTime] = useState(0);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isReactNative = typeof window !== 'undefined' && (window as any).ReactNativeWebView;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && !isDataLoaded) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setCount(data.count || 0);
          setMalas(data.malas || 0);
        }
        setIsDataLoaded(true);
      });

      const today = new Date().toISOString().split("T")[0];
      const dailyStatDocRef = doc(db, `users/${user.uid}/daily_stats`, today);
      const unsubscribeStats = onSnapshot(dailyStatDocRef, (doc) => {
          if (doc.exists()) {
              setTodaysJapa(doc.data().chantCount || 0);
          } else {
              setTodaysJapa(0);
          }
      });

      return () => {
          unsubscribeUser();
          unsubscribeStats();
      };
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

  const updateDailyChantCount = useCallback(async () => {
    if (!user) return;
    
    // Optimistically update the UI
    setTodaysJapa(prevJapa => prevJapa + 1);

    const today = new Date().toISOString().split("T")[0];
    const dailyStatDocRef = doc(db, `users/${user.uid}/daily_stats`, today);

    try {
        const docSnap = await getDoc(dailyStatDocRef);
        if (docSnap.exists()) {
            await updateDoc(dailyStatDocRef, { chantCount: increment(1) });
        } else {
            await setDoc(dailyStatDocRef, { chantCount: 1, date: today });
        }
    } catch (error) {
        console.error("Error updating daily chant count:", error);
        // Revert UI update on error
        setTodaysJapa(prevJapa => prevJapa - 1);
    }
  }, [user]);

  useEffect(() => {
    audioRef.current = new Audio();

    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isChanting) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isChanting]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!isChanting && mode !== "auto") {
        onEnd?.();
        return;
    }
    if (audioSource === 'custom' && customAudioUrl && audioRef.current) {
        const audio = audioRef.current;
        audio.src = customAudioUrl; // Ensure src is set every time
        const handleAudioEnd = () => {
            onEnd?.();
            audio.removeEventListener('ended', handleAudioEnd);
        };
        audio.addEventListener('ended', handleAudioEnd);
        audio.playbackRate = 0.5 + (chantSpeed / 100) * 1.5;
        audio.play().catch(e => {
            console.error("Audio play failed:", e);
            onEnd?.(); // Ensure cycle continues even if play fails
        });
        return;
    }

    if (isReactNative) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SPEAK',
         text: text, language: voiceLang || 'hi-IN' 
      }));
       setTimeout(() => onEnd?.(), 1000);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis && voiceName) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang;
      utterance.rate = 0.5 + (chantSpeed / 100) * 1.5; 
      const selectedVoice = voices.find((v) => v.name === voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onend = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    } else {
        onEnd?.();
    }
  }, [voiceName, voiceLang, voices, isChanting, mode, audioSource, customAudioUrl, isReactNative, chantSpeed]);
  
  const handleIncrement = useCallback(() => {
    setChantAnimationKey(prev => prev + 1);
    updateDailyChantCount();
    setCount((prevCount) => {
      const newCount = prevCount + 1;
      if (newCount >= MALA_COUNT) {
        const newMalas = malas + 1;
        setMalas(newMalas);
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 2000);
        saveData(0, newMalas);
        
        return 0;
      }
      saveData(newCount, malas);
      return newCount;
    });
  }, [malas, saveData, updateDailyChantCount]);

  useEffect(() => {
    let isMounted = true;
    let chantTimeout: NodeJS.Timeout;

    const chantCycle = () => {
        if (!isChanting || mode !== "auto" || !isMounted) return;

        speak(chantText, () => {
            if (isMounted && isChanting) {
                handleIncrement();
                const delay = 50; 
                chantTimeout = setTimeout(chantCycle, delay);
            }
        });
    };

    if (mode === "auto" && isChanting) {
        chantCycle();
    }

    return () => {
        isMounted = false;
        clearTimeout(chantTimeout);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };
}, [isChanting, mode, chantText, speak, handleIncrement]);


  const handleManualTap = () => { if (mode === "manual") { setIsChanting(true); speak(chantText, () => setIsChanting(false)); handleIncrement(); } };
  const handleAutoToggle = () => { if (mode === "auto") setIsChanting((prev) => !prev); };
  const handleSignOut = async () => { await auth.signOut(); router.push("/login"); };

  if (loading || !user || !isDataLoaded) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalJapa = malas * MALA_COUNT + count;
  const progress = (count / MALA_COUNT) * 100;

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="flex justify-between items-center w-full mb-4">
            <div className="flex items-center gap-2">
                <PeacockIcon className="h-10 w-10" />
                <h1 className="font-headline text-xl font-bold text-foreground">Prabhu Milan Naam Jaap</h1>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild><Link href="/profile"><UserIcon className="h-5 w-5"/></Link></Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="h-5 w-5"/></Button>
            </div>
        </header>

        <Card className="w-full shadow-lg mb-6">
            <CardContent className="p-4 flex flex-col items-center">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary mb-1">
                    <Clock className="h-5 w-5" />
                    <span>{formatTime(sessionTime)}</span>
                </div>
                <div className="text-2xl font-bold text-center text-accent/80 break-words max-w-[80%] mb-2" style={{ textShadow: '0 0 8px hsl(var(--accent) / 0.4)' }}>
                    {chantText ==='वाहेगुरु'?'ਵਾਹਿਗੁਰੂ':chantText}
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center my-4">
                    <svg className="absolute inset-0" viewBox="0 0 100 100">
                        <circle className="text-secondary/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        <circle
                            className="text-primary"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={2 * Math.PI * 42 * (1 - progress / 100)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="42"
                            cx="50"
                            cy="50"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                    </svg>
                    <div className="relative text-center">
                         <div className="text-7xl font-bold text-foreground">{count}</div>
                    </div>
                </div>

                <div className="w-full px-4">
                     <ChantController
                        mode={mode}
                        setMode={(newMode) => {
                            setIsChanting(false);
                            setMode(newMode);
                        }}
                        onManualTap={handleManualTap}
                        onAutoToggle={handleAutoToggle}
                        isAutoChanting={isChanting}
                    />
                </div>
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <Card className="shadow-md">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                    <MalaBeadsIcon className="h-6 w-6 mb-1 text-primary fill-primary"/>
                    <p className="text-sm font-semibold">Total Jaap</p>
                    <p className="text-2xl font-bold">{totalJapa}</p>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                    <Calendar className="h-6 w-6 mb-1 text-primary"/>
                    <p className="text-sm font-semibold">Today's Jaap</p>
                    <p className="text-2xl font-bold">{todaysJapa}</p>
                </CardContent>
            </Card>
        </div>


        <AudioStyleSelector 
          audioSource={audioSource}
          setVoiceName={setVoiceName}
          setVoiceLang={setVoiceLang}
          setAudioSource={setAudioSource}
          setCustomAudioUrl={setCustomAudioUrl}
          isChanting={isChanting}
          chantText={chantText}
          setChantText={setChantText}
          chantSpeed={chantSpeed}
          setChantSpeed={setChantSpeed}
        />
      </div>
    </main>
  );
}
