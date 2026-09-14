'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore, useAuthStore } from '@/lib/store';
import { Bell, MessageSquare, Send, Megaphone, Plus, Settings, Loader2, AlertTriangle, Rocket } from 'lucide-react';
import { Button } from '@sms/ui';
import { Input } from '@sms/ui';
import { Label } from '@sms/ui';
import { Badge } from '@sms/ui';

function listOf<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const d = (res as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

const CHANNELS = ['sms', 'email', 'push'] as const;
const AUDIENCES = ['all', 'branch', 'grade_level', 'section', 'custom'] as const;
const EVENT_TYPES = [
  'enrollment.confirmed',
  'invoice.generated',
  'payment.received',
  'attendance.absent',
  'grade.posted',
  'announcement.published',
  'document.ready',
] as const;

interface Announcement {
  id: string;
  title: string;
  body: string;
  audienceType: string;
  channel: string[] | string;
  sentAt: string | null;
  createdAt: string;
}
interface NotificationTemplate {
  id: string;
  name: string;
  channel: string;
  eventType: string;
  subjectTemplate?: string;
  bodyTemplate: string;
}
interface Thread {
  id: string;
  subject: string;
  studentId?: string | null;
  updatedAt?: string;
  createdAt: string;
}
interface Message {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export default function CommunicationsPage() {
  const { currentTenantId } = useTenantStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'announcements' | 'templates' | 'threads'>('announcements');
  const [error, setError] = useState('');

  // --- Announcements ---
  const { data: announcements, isLoading: loadingAnn } = useQuery({
    queryKey: ['announcements', currentTenantId],
    queryFn: () => apiClient.communications.getAnnouncements({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', body: '', audienceType: 'all', channels: ['sms', 'email', 'push'] as string[] });

  const createAnnouncement = useMutation({
    mutationFn: () =>
      apiClient.communications.createAnnouncement({
        title: annForm.title,
        body: annForm.body,
        audienceType: annForm.audienceType,
        channel: annForm.channels,
        createdBy: user?.id ?? null,
      }),
    onSuccess: () => {
      setShowAnnForm(false);
      setAnnForm({ title: '', body: '', audienceType: 'all', channels: ['sms', 'email', 'push'] });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['announcements', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create announcement'),
  });

  const publishAnnouncement = useMutation({
    mutationFn: (id: string) => apiClient.communications.publishAnnouncement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', currentTenantId] }),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to publish'),
  });

  // --- Templates ---
  const { data: templates } = useQuery({
    queryKey: ['notification-templates', currentTenantId],
    queryFn: () => apiClient.communications.getTemplates({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && activeTab === 'templates',
  });

  const [showTplForm, setShowTplForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', channel: 'email', eventType: EVENT_TYPES[0] as string, subjectTemplate: '', bodyTemplate: '' });

  const createTemplate = useMutation({
    mutationFn: () => apiClient.communications.createTemplate(tplForm),
    onSuccess: () => {
      setShowTplForm(false);
      setTplForm({ name: '', channel: 'email', eventType: EVENT_TYPES[0], subjectTemplate: '', bodyTemplate: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['notification-templates', currentTenantId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create template'),
  });

  // --- Threads ---
  const { data: threads, isLoading: loadingThreads } = useQuery({
    queryKey: ['message-threads', currentTenantId, user?.id],
    queryFn: () => apiClient.communications.getThreads({ tenantId: currentTenantId!, userId: user?.id ?? '' }),
    enabled: !!currentTenantId && activeTab === 'threads' && !!user?.id,
  });

  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ['thread-messages', openThreadId],
    queryFn: () => apiClient.communications.getMessages(openThreadId!),
    enabled: !!openThreadId,
  });

  const [reply, setReply] = useState('');
  const sendMessage = useMutation({
    mutationFn: () => apiClient.communications.sendMessage(openThreadId!, { body: reply }),
    onSuccess: () => {
      setReply('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['thread-messages', openThreadId] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to send message'),
  });

  const [showThreadForm, setShowThreadForm] = useState(false);
  const [threadForm, setThreadForm] = useState({ subject: '' });
  const createThread = useMutation({
    mutationFn: () =>
      apiClient.communications.createThread({ subject: threadForm.subject, createdBy: user?.id ?? null, participantIds: [user?.id ?? ''] }),
    onSuccess: () => {
      setShowThreadForm(false);
      setThreadForm({ subject: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['message-threads', currentTenantId, user?.id] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create thread'),
  });

  const annList = useMemo(() => listOf<Announcement>(announcements), [announcements]);
  const tplList = useMemo(() => listOf<NotificationTemplate>(templates), [templates]);
  const threadList = useMemo(() => listOf<Thread>(threads), [threads]);
  const msgList = useMemo(() => listOf<Message>(messages), [messages]);

  // Keep an open thread's messages fresh when switching threads
  useEffect(() => {
    if (openThreadId) queryClient.invalidateQueries({ queryKey: ['thread-messages', openThreadId] });
  }, [openThreadId, queryClient]);

  const tabs = [
    { id: 'announcements' as const, label: 'Announcements', icon: Megaphone, count: annList.length },
    { id: 'templates' as const, label: 'Templates', icon: Settings, count: tplList.length },
    { id: 'threads' as const, label: 'Messages', icon: MessageSquare, count: threadList.length },
  ];

  const channelsOf = (c: Announcement['channel']) =>
    Array.isArray(c) ? c.join(', ') : String(c ?? '').split(',').filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">Announcements, notification templates, and parent messaging</p>
        </div>
        {activeTab === 'announcements' && (
          <Button onClick={() => setShowAnnForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        )}
        {activeTab === 'templates' && (
          <Button onClick={() => setShowTplForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        )}
        {activeTab === 'threads' && (
          <Button onClick={() => setShowThreadForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New Thread
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="rounded-full bg-muted px-1.5 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {showAnnForm && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold">Create Announcement</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-title">Title</Label>
                  <Input id="ann-title" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g. Parent-Teacher Conference" />
                </div>
                <div className="space-y-1.5">
                  <Label>Audience</Label>
                  <select
                    value={annForm.audienceType}
                    onChange={(e) => setAnnForm({ ...annForm, audienceType: e.target.value })}
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  >
                    {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-body">Body</Label>
                <textarea
                  id="ann-body"
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                  rows={4}
                  className="flex w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Announcement content sent to the selected audience…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Channels</Label>
                <div className="flex gap-4">
                  {CHANNELS.map((ch) => (
                    <label key={ch} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={annForm.channels.includes(ch)}
                        onChange={(e) =>
                          setAnnForm({
                            ...annForm,
                            channels: e.target.checked
                              ? [...annForm.channels, ch]
                              : annForm.channels.filter((x) => x !== ch),
                          })
                        }
                      />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAnnForm(false)}>Cancel</Button>
                <Button
                  disabled={!annForm.title.trim() || !annForm.body.trim() || annForm.channels.length === 0 || createAnnouncement.isPending}
                  onClick={() => createAnnouncement.mutate()}
                >
                  {createAnnouncement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Draft
                </Button>
              </div>
            </div>
          )}

          {loadingAnn ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : annList.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="mt-4 text-muted-foreground">No announcements yet. Create one to notify parents and staff.</p>
            </div>
          ) : (
            annList.map((ann) => (
              <div key={ann.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{ann.title}</h3>
                  {ann.sentAt ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => publishAnnouncement.mutate(ann.id)} disabled={publishAnnouncement.isPending}>
                      <Rocket className="mr-1.5 h-3.5 w-3.5" /> Publish
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">{ann.body}</p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Audience: {ann.audienceType}</span>
                  <span>Channels: {channelsOf(ann.channel) || '—'}</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {showTplForm && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold">Create Notification Template</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Name</Label>
                  <Input id="tpl-name" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="e.g. Payment Received — Email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <select
                    value={tplForm.channel}
                    onChange={(e) => setTplForm({ ...tplForm, channel: e.target.value })}
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  >
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Event</Label>
                  <select
                    value={tplForm.eventType}
                    onChange={(e) => setTplForm({ ...tplForm, eventType: e.target.value })}
                    className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                  >
                    {EVENT_TYPES.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Subject (email only, supports {'{{variables}}'})</Label>
                <Input id="tpl-subject" value={tplForm.subjectTemplate} onChange={(e) => setTplForm({ ...tplForm, subjectTemplate: e.target.value })} placeholder="e.g. Payment of {{amount}} received — thank you" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Body template</Label>
                <textarea
                  id="tpl-body"
                  value={tplForm.bodyTemplate}
                  onChange={(e) => setTplForm({ ...tplForm, bodyTemplate: e.target.value })}
                  rows={4}
                  className="flex w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                  placeholder={'Dear {{student_name}},\n\nYour payment of {{amount}} was received on {{date}}.'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTplForm(false)}>Cancel</Button>
                <Button disabled={!tplForm.name.trim() || !tplForm.bodyTemplate.trim() || createTemplate.isPending} onClick={() => createTemplate.mutate()}>
                  {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </div>
          )}

          {tplList.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="mt-4 text-muted-foreground">No notification templates yet. Templates fill in variables like {'{{student_name}}'} when a notification fires.</p>
            </div>
          ) : (
            tplList.map((tpl) => (
              <div key={tpl.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{tpl.name}</h3>
                  <Badge variant="info">{tpl.channel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Event: <code className="text-xs">{tpl.eventType}</code></p>
                {tpl.subjectTemplate && <p className="text-sm mt-1">Subject: {tpl.subjectTemplate}</p>}
                <p className="text-sm mt-2 bg-muted p-2 rounded font-mono text-xs whitespace-pre-line line-clamp-3">{tpl.bodyTemplate}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Threads Tab */}
      {activeTab === 'threads' && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3">
            {showThreadForm && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h3 className="font-semibold">New Thread</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="th-subject">Subject</Label>
                  <Input id="th-subject" value={threadForm.subject} onChange={(e) => setThreadForm({ subject: e.target.value })} placeholder="e.g. Question about enrollment requirements" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowThreadForm(false)}>Cancel</Button>
                  <Button size="sm" disabled={!threadForm.subject.trim() || createThread.isPending} onClick={() => createThread.mutate()}>
                    {createThread.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Create
                  </Button>
                </div>
              </div>
            )}

            {loadingThreads ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !user?.id ? (
              <div className="rounded-lg border bg-card p-8 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">Sign in to view your message threads.</p>
              </div>
            ) : threadList.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="mt-4 text-muted-foreground">No message threads yet. Start one to begin a conversation.</p>
              </div>
            ) : (
              threadList.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setOpenThreadId(thread.id === openThreadId ? null : thread.id)}
                  className={`w-full rounded-lg border bg-card p-4 text-left transition-colors ${openThreadId === thread.id ? 'border-primary' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{thread.subject || 'No subject'}</h3>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {thread.studentId ? 'Regarding a student' : 'General thread'}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="rounded-lg border bg-card flex flex-col min-h-[400px]">
            {openThreadId ? (
              <>
                <div className="border-b p-4">
                  <h3 className="font-semibold">{threadList.find((t) => t.id === openThreadId)?.subject ?? 'Thread'}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : msgList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet — say hello.</p>
                  ) : (
                    msgList.map((m) => {
                      const mine = m.senderUserId === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="whitespace-pre-line">{m.body}</p>
                            <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {new Date(m.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && reply.trim()) {
                        e.preventDefault();
                        sendMessage.mutate();
                      }
                    }}
                    placeholder="Type a message… (Enter to send)"
                  />
                  <Button disabled={!reply.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
                    {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
                Select a thread to view the conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
