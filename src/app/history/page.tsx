'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import UserProfile from '@/components/UserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface NaamJaapSession {
  id: string;
  startTime: string;
  endTime: string;
  totalCount: number;
  malaCount: number;
  chantText: string;
}

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  const sessionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/naamJaapSessions`),
      orderBy('startTime', 'desc')
    );
  }, [user, firestore]);

  const { data: sessions, isLoading } = useCollection<NaamJaapSession>(sessionsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const groupedSessions = useMemo(() => {
    if (!sessions) return {};
    return sessions.reduce((acc, session) => {
      const date = format(new Date(session.startTime), 'MMMM d, yyyy');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    }, {} as Record<string, NaamJaapSession[]>);
  }, [sessions]);

  if (isUserLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-20 w-full mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
       <div className="container mx-auto p-4 md:p-8">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chanting
          </Button>
         <UserProfile />
        <h1 className="text-3xl font-bold mt-8 mb-6">Chanting History</h1>
        
        {Object.keys(groupedSessions).length === 0 ? (
          <p className="text-muted-foreground">You don&apos;t have any saved sessions yet.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(groupedSessions).map(([date, daySessions]) => (
              <AccordionItem value={date} key={date}>
                <AccordionTrigger className="text-xl font-semibold">
                  {date}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {daySessions.map((session) => (
                      <Card key={session.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Session at {format(new Date(session.startTime), 'p')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Total Count</p>
                            <p className="text-primary font-bold text-lg">{session.totalCount}</p>
                          </div>
                          <div>
                            <p className="font-medium">Malas Completed</p>
                            <p className="text-primary font-bold text-lg">{session.malaCount}</p>
                          </div>
                          <div className="col-span-2">
                             <p className="font-medium">Chant</p>
                             <p>&quot;{session.chantText}&quot;</p>
                          </div>
                          <div>
                            <p className="font-medium">Duration</p>
                            <p>{format(new Date(session.endTime), 'p')} - {format(new Date(session.startTime), 'p')}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </main>
  );
}
