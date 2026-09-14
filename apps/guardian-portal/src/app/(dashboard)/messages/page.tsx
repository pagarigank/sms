'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useStudentStore } from '@/lib/student-store';
import { MessageSquare, Send, Plus, Loader2, AlertTriangle } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { students, selectedStudentId } = useStudentStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);

  const { data: threads, isLoading: loadingThreads } = useQuery({
    queryKey: ['message-threads', user?.id],
    queryFn: () => apiClient.communications.getThreads({ tenantId: '', userId: user?.id || '' }),
    enabled: !!user?.id,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedThread],
    queryFn: () => apiClient.communications.getMessages(selectedThread!),
    enabled: !!selectedThread,
  });

  const sendMessage = useMutation({
    mutationFn: () => apiClient.communications.sendMessage(selectedThread!, { body: newMessage }),
    onSuccess: () => {
      setNewMessage('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedThread] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to send message'),
  });

  const createThread = useMutation({
    mutationFn: () =>
      apiClient.communications.createThread({
        tenantId: '',
        // Backend requires branchId (uuid NOT NULL) — use the selected
        // child's branch. Tying the thread to the student also lets staff
        // see context.
        branchId: students.find((s) => s.id === selectedStudentId)?.branchId ?? (undefined as any),
        subject: newSubject,
        studentId: selectedStudentId ?? undefined,
        createdBy: user?.id || '',
        participantIds: [user?.id ?? ''],
      } as any),
    onSuccess: (result) => {
      const thread = result.data as any;
      if (thread?.id) setSelectedThread(thread.id);
      setShowNewThread(false);
      setNewSubject('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
    onError: (e: any) => setError(e?.message ?? 'Failed to start conversation'),
  });

  const threadList = (threads?.data as any[]) ?? [];
  const messageList = (messages?.data as any[]) ?? [];

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-lg border bg-white shadow-sm overflow-hidden">
      {/* Thread List */}
      <div className="w-80 border-r flex flex-col">
        {error && (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 p-2 flex items-center gap-1.5 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Messages</h3>
          <button
            onClick={() => setShowNewThread(true)}
            className="text-primary hover:text-primary/80"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {loadingThreads ? (
            <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : threadList.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No conversations yet</div>
          ) : (
            threadList.map((thread: any) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`w-full text-left p-3 hover:bg-gray-50 ${
                  selectedThread === thread.id ? 'bg-primary/5' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {thread.subject || 'No subject'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messageList.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderUserId === user?.id
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-[hsl(var(--surface-muted))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  <p className="text-sm">{msg.body}</p>
                  <p className={`text-xs mt-1 ${msg.senderUserId === user?.id ? 'opacity-70' : 'text-[hsl(var(--ink-300))]'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {messageList.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-3 flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMessage.trim()) {
                    sendMessage.mutate();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 h-9 rounded-md border px-3 py-1 text-sm"
              />
              <button
                onClick={() => sendMessage.mutate()}
                disabled={!newMessage.trim() || sendMessage.isPending}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
            <div>
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                placeholder="What is this about?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewThread(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createThread.mutate()}
                disabled={!newSubject.trim() || createThread.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {createThread.isPending ? 'Creating...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
