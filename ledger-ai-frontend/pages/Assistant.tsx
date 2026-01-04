import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Input, AnimatedText } from '../components/UI';
import { ai } from '../services/api';

type ChatMessage = {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
};

const Assistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      setError(null);
      try {
        const resp = await ai.assistantHistory();
        const raw = (resp?.data?.messages || []) as any[];
        const mapped: ChatMessage[] = raw
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ id: m.id, role: m.role, content: m.content }));
        setMessages(mapped);
      } catch (e) {
        console.error('Failed to load assistant history', e);
        setError('Unable to load assistant history.');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    // optimistic add
    const optimisticUser: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, optimisticUser]);
    setText('');

    try {
      const resp = await ai.assistantSend(trimmed);
      const reply = String(resp?.data?.reply || '').trim();
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry — I could not generate a reply right now.' }]);
      }
    } catch (e) {
      console.error('Failed to send message', e);
      setError('Unable to send message right now.');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry — I could not generate a reply right now.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">
          <AnimatedText text="AI Assistant" />
        </h1>
        <p className="text-zinc-500 mt-2">Your conversation is saved to your account.</p>
      </div>

      <Card className="h-[60vh] flex flex-col" noHover>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loadingHistory ? (
            <p className="text-sm text-zinc-500">Loading conversation…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-zinc-500">Ask a question about your spending, trends, or the app.</p>
          ) : null}

          {messages.map((m, idx) => (
            <div
              key={`${m.role}-${m.id ?? idx}`}
              className={`max-w-[85%] rounded-xl px-4 py-3 border ${
                m.role === 'user'
                  ? 'ml-auto bg-black text-white border-black'
                  : 'mr-auto bg-zinc-50 text-zinc-900 border-zinc-200'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-4 flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Why are my expenses higher this month?"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <Button variant="primary" onClick={send} isLoading={sending} disabled={!canSend}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Assistant;
