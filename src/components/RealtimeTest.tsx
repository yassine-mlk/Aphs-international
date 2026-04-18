import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const RealtimeTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Déconnecté');
  const [events, setEvents] = useState<string[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) {
      setStatus('Client Supabase non disponible');
      return;
    }

    // Tester subscription messages
    const messagesChannel = supabase
      .channel('test-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const msg = `[${new Date().toLocaleTimeString()}] Message event: ${JSON.stringify(payload.eventType)}`;
        setEvents(prev => [msg, ...prev.slice(0, 9)]);
      })
      .subscribe((s) => {
        setStatus(`Messages: ${s}`);
      });

    // Tester subscription notifications
    const notifChannel = supabase
      .channel('test-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        const msg = `[${new Date().toLocaleTimeString()}] Notification event: ${JSON.stringify(payload.eventType)}`;
        setEvents(prev => [msg, ...prev.slice(0, 9)]);
      })
      .subscribe((s) => {
        setStatus(prev => `${prev}, Notifs: ${s}`);
      });

    setChannels([messagesChannel, notifChannel]);

    return () => {
      messagesChannel.unsubscribe();
      notifChannel.unsubscribe();
    };
  }, []);

  const testInsert = async () => {
    try {
      // Test insert dans messages (sera supprimé immédiatement)
      const testId = `test-${Date.now()}`;
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: testId,
          content: 'Test message',
          sender_id: 'test'
        });
      
      if (error) {
        setEvents(prev => [`[ERREUR INSERT] ${error.message}`, ...prev.slice(0, 9)]);
      } else {
        setEvents(prev => [`[INSERT OK] Test message envoyé`, ...prev.slice(0, 9)]);
        // Cleanup
        await supabase.from('messages').delete().eq('conversation_id', testId);
      }
    } catch (e: any) {
      setEvents(prev => [`[EXCEPTION] ${e.message}`, ...prev.slice(0, 9)]);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🔴 Test Realtime Supabase
          <Badge variant={status.includes('SUBSCRIBED') ? 'default' : 'destructive'}>
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" onClick={testInsert} className="w-full">
          Tester INSERT messages
        </Button>
        <div className="text-xs font-mono bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
          {events.length === 0 ? 'En attente d\'événements...' : null}
          {events.map((e, i) => (
            <div key={i} className="border-b border-gray-200 py-1">{e}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
