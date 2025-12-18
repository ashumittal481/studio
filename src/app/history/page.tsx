'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import UserProfile from '@/components/UserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MalaBeadsIcon } from '@/lib/icons';

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

  const dailyMalas = useMemo(() => {
    if (!sessions) return {};
    return sessions.reduce((acc, session) => {
      const date = format(new Date(session.startTime), 'MMMM d, yyyy');
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += session.malaCount;
      return acc;
    }, {} as Record<string, number>);
  }, [sessions]);

  if (isUserLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-20 w-full mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
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
        <h1 className="text-3xl font-bold mt-8 mb-6">Mala History</h1>
        
        {Object.keys(dailyMalas).length === 0 ? (
          <p className="text-muted-foreground">You don&apos;t have any saved chanting history yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(dailyMalas).map(([date, totalMalas]) => (
              <Card key={date}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-lg font-semibold">{date}</p>
                        <p className="text-sm text-muted-foreground">Total Malas Completed</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <MalaBeadsIcon className="h-6 w-6 text-primary" />
                        <p className="text-3xl font-bold text-primary">{totalMalas}</p>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
