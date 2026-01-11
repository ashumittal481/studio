
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ChantController from "@/components/ChantController";
import AudioStyleSelector from "@/components/AudioStyleSelector";
import { LogOut, Settings, BarChart, Calendar, Repeat, Clock, HelpCircle, User as UserIcon, Expand, Minimize } from "lucide-react";
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
import { cn } from "@/lib/utils";


const MALA_COUNT = 108;
export type AudioSource = "ai" | "custom";

interface SavedChantState {
  chantText: string;
  audioSource: AudioSource;
  voiceName?: string;
  voiceLang?: string;
  customAudioUrl?: string | null;
}


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
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>("/audio/radhaMaharajji.m4a");
  
  const [chantAnimationKey, setChantAnimationKey] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  // Refs for seamless audio looping
  const audioPlayer1Ref = useRef<HTMLAudioElement | null>(null);
  const audioPlayer2Ref = useRef<HTMLAudioElement | null>(null);
  const activePlayerRef = useRef<number>(1);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
    // Load last used chant from localStorage on initial render
    try {
        const savedChantState = localStorage.getItem('lastChantState');
        if (savedChantState) {
            const state: SavedChantState = JSON.parse(savedChantState);
            setChantText(state.chantText);
            setAudioSource(state.audioSource);
            setVoiceName(state.voiceName);
            setVoiceLang(state.voiceLang || 'hi-IN');
            setCustomAudioUrl(state.customAudioUrl || null);
        }
    } catch (error) {
        console.error("Failed to load chant state from localStorage", error);
    }
  }, []);

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

  const updateDailyChantCount = useCallback(async () => {
    if (!user) return;
    
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
        // Revert local state if update fails
        setTodaysJapa(prevJapa => prevJapa > 0 ? prevJapa - 1 : 0);
    }
  }, [user]);

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
        // Persist malas count but reset chant count
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            setDoc(userDocRef, { count: 0, malas: newMalas }, { merge: true });
        }
        return 0;
      }
      // Persist only count
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        setDoc(userDocRef, { count: newCount }, { merge: true });
      }
      return newCount;
    });
  }, [malas, user, updateDailyChantCount]);

  // Effect to initialize Web Audio API and load the audio file
  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioPlayer1Ref.current = new Audio();
        audioPlayer2Ref.current = new Audio();
    }
  }, []);

  useEffect(() => {
      if (customAudioUrl && audioPlayer1Ref.current && audioPlayer2Ref.current) {
          audioPlayer1Ref.current.src = customAudioUrl;
          audioPlayer2Ref.current.src = customAudioUrl;
          audioPlayer1Ref.current.load();
          audioPlayer2Ref.current.load();
      }
  }, [customAudioUrl]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
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

  const playAudioSeamlessly = useCallback(() => {
      if (!audioPlayer1Ref.current || !audioPlayer2Ref.current || !audioPlayer1Ref.current.duration) return;

      const player1 = audioPlayer1Ref.current;
      const player2 = audioPlayer2Ref.current;
      const duration = player1.duration;

      const playNext = () => {
          const currentTime = activePlayerRef.current === 1 ? player1.currentTime : player2.currentTime;
          
          if (duration - currentTime < 0.5) {
              if (activePlayerRef.current === 1) {
                  player2.currentTime = 0;
                  player2.play();
                  activePlayerRef.current = 2;
              } else {
                  player1.currentTime = 0;
                  player1.play();
                  activePlayerRef.current = 1;
              }
              handleIncrement();
          }
      };

      if (!isChanting) {
          player1.pause();
          player2.pause();
          if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
          return;
      }
      
      handleIncrement();
      player1.currentTime = 0;
      player1.play();
      activePlayerRef.current = 1;
      
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = setInterval(playNext, 100); // Check every 100ms
  }, [isChanting, handleIncrement]);


  const stopAudioSeamlessly = useCallback(() => {
    if(audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioPlayer1Ref.current?.pause();
    audioPlayer2Ref.current?.pause();
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (audioSource === 'custom' && customAudioUrl) {
        const player = audioPlayer1Ref.current;
        if(player) {
            player.currentTime = 0;
            player.play();
            const handleEnded = () => {
                onEnd?.();
                player.removeEventListener('ended', handleEnded);
            }
            player.addEventListener('ended', handleEnded);
        }
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
  }, [voiceName, voiceLang, voices, audioSource, isReactNative, chantSpeed, customAudioUrl]);
  

useEffect(() => {
    let chantCycleCleanup: (() => void) | undefined;

    if (isChanting && mode === "auto") {
        if (audioSource === 'custom' && customAudioUrl) {
            playAudioSeamlessly();
            chantCycleCleanup = () => stopAudioSeamlessly();
        } else {
            let isMounted = true;
            const chantCycle = () => {
                if (!isMounted || !isChanting) return;
                speak(chantText, () => {
                    if (isMounted && isChanting) {
                        handleIncrement();
                        setTimeout(chantCycle, 50);
                    }
                });
            };
            chantCycle();
            chantCycleCleanup = () => { isMounted = false; };
        }
    } else {
      if(audioSource === 'custom'){
        stopAudioSeamlessly();
      }
    }

    return () => {
        chantCycleCleanup?.();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };
}, [isChanting, mode, audioSource, chantText, speak, handleIncrement, customAudioUrl, playAudioSeamlessly, stopAudioSeamlessly]);


  const handleManualTap = () => { if (mode === "manual") { handleIncrement(); } };
  
  const handleAutoToggle = () => {
    setIsChanting(prev => !prev);
  };

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

  const ImmersiveWrapper = ({ children }: { children: React.ReactNode }) => 
    isImmersive && mode === 'manual' ? (
      <div
        className="fixed inset-0 z-50 flex h-full w-full cursor-pointer items-center justify-center bg-background flex-col"
        onClick={handleManualTap}
      >
        <div
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        onClick={()=>{setIsImmersive(false)}}>Remove immersive mode</div>
        {children}
      </div>
    ) : (
      <>{children}</>
    );

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        <header className={cn("flex justify-between items-center w-full mb-4", isImmersive && "hidden")}>
            <div className="flex items-center gap-2">
                <PeacockIcon className="h-10 w-10" />
                <h1 className="font-headline text-xl font-bold text-foreground">Prabhu Milan Naam Jaap</h1>
            </div>
            <div className="flex items-center gap-2">
                {mode === 'manual'? <Button variant="ghost" size="icon" onClick={() => setIsImmersive(p => !p)}>
                    {isImmersive ? <Minimize className="h-5 w-5"/> : <Expand className="h-5 w-5"/>}
                </Button>:null}
                <Button variant="ghost" size="icon" asChild><Link href="/profile"><UserIcon className="h-5 w-5"/></Link></Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="h-5 w-5"/></Button>
            </div>
        </header>
        
        <ImmersiveWrapper>
            <Card 
            onClick={handleManualTap}
            className={cn(
                "w-full shadow-lg",
                isImmersive ? "bg-transparent border-0 shadow-none" : "mb-6"
            )}>
                <CardContent className="p-4 flex flex-col items-center">
                    <div className={cn("flex items-center gap-2 text-lg font-semibold text-primary mb-1", isImmersive && "hidden")}>
                        <Clock className="h-5 w-5" />
                        <span>{formatTime(sessionTime)}</span>
                    </div>
                     <div className={cn("text-2xl font-bold text-center text-accent/80 break-words max-w-[80%] mb-2", isImmersive && "hidden")} style={{ textShadow: '0 0 8px hsl(var(--accent) / 0.4)' }}>
                        {chantText ==='वाहेगुरु' ? 'ਵਾਹਿਗੁਰੂ' : chantText}
                    </div>

                    <div
                    onClick={handleManualTap}
                    className={cn(
                        "relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-4",
                        isImmersive && "w-[90vw] h-[90vw] sm:w-[90vw] sm:h-[90vw]"
                    )}>
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
                            <div className={cn("text-7xl font-bold text-foreground", isImmersive && "text-8xl")}>{count}</div>
                        </div>
                    </div>

                    <div className={cn("w-full px-4", isImmersive && "hidden")}>
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
        </ImmersiveWrapper>
        
        <div className={cn("grid grid-cols-2 gap-4 w-full mb-6", isImmersive && "hidden")}>
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


        <div className={cn(isImmersive && "hidden")}>
            <AudioStyleSelector 
            chantState={{
                chantText,
                audioSource,
                voiceName,
                voiceLang,
                customAudioUrl,
            }}
            setChantState={(newState) => {
                setChantText(newState.chantText);
                setAudioSource(newState.audioSource);
                setVoiceName(newState.voiceName);
                setVoiceLang(newState.voiceLang || 'hi-IN');
                setCustomAudioUrl(newState.customAudioUrl || null);
            }}
            isChanting={isChanting}
            chantSpeed={chantSpeed}
            setChantSpeed={setChantSpeed}
            />
        </div>
      </div>
    </main>
  );
}

    