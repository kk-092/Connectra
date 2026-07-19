import {
  Archive,
  CheckCheck,
  FileText,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  UserRound,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase/client'
import './index.css'

type View = 'chats' | 'groups' | 'users' | 'files' | 'admin' | 'settings'
type Role = 'admin' | 'employee'

type Profile = {
  id: string
  full_name: string
  email: string
  role: Role
  status: 'active' | 'suspended'
}

type Conversation = {
  id: string
  title: string | null
  type: 'group' | 'direct'
  created_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  body: string
  created_at: string
  attachment_name?: string
  attachment_path?: string
}

const demoProfile: Profile = {
  id: 'demo-admin',
  full_name: 'Vaibhav Pareek',
  email: 'admin@connectra.local',
  role: 'admin',
  status: 'active',
}

const demoUsers: Profile[] = [
  demoProfile,
  { id: 'u-2', full_name: 'Narendar I', email: 'narendar@company.local', role: 'employee', status: 'active' },
  { id: 'u-3', full_name: 'Abhay Tank', email: 'abhay@company.local', role: 'employee', status: 'active' },
  { id: 'u-4', full_name: 'Anisha Mishra', email: 'anisha@company.local', role: 'employee', status: 'active' },
  { id: 'u-5', full_name: 'Bharat Sharma', email: 'bharat@company.local', role: 'employee', status: 'active' },
]

const demoConversations: Conversation[] = [
  { id: 'company-lobby', title: 'Company Lobby', type: 'group', created_at: new Date().toISOString() },
  { id: 'operations', title: 'Operations', type: 'group', created_at: new Date().toISOString() },
]

const demoMessages: Message[] = [
  {
    id: 'm-1',
    conversation_id: 'company-lobby',
    sender_id: 'u-2',
    sender_name: 'Narendar I',
    body: 'Hey there, I am using Connectra.',
    created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
  },
  {
    id: 'm-2',
    conversation_id: 'company-lobby',
    sender_id: demoProfile.id,
    sender_name: demoProfile.full_name,
    body: 'Team updates aur file sharing yahin rakhenge.',
    created_at: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
  },
  {
    id: 'm-3',
    conversation_id: 'operations',
    sender_id: 'u-3',
    sender_name: 'Abhay Tank',
    body: 'Delivery schedule uploaded.',
    created_at: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    attachment_name: 'delivery-plan.pdf',
    attachment_path: 'demo/delivery-plan.pdf',
  },
]

function App() {
  const [view, setView] = useState<View>('chats')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isDemoOpen, setIsDemoOpen] = useState(!isSupabaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) return

    client.auth.getUser().then(({ data }) => {
      if (!data.user) return
      loadProfile(data.user.id).then(setProfile).catch((error: Error) => setAuthError(error.message))
    })

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null)
        return
      }
      loadProfile(session.user.id).then(setProfile).catch((error: Error) => setAuthError(error.message))
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const activeProfile = profile ?? (isDemoOpen ? demoProfile : null)

  if (!activeProfile) {
    return <LoginScreen error={authError} onDemo={() => setIsDemoOpen(true)} onError={setAuthError} />
  }

  return (
    <div className="messenger-shell">
      <Rail activeView={view} onViewChange={setView} profile={activeProfile} />
      <main className="messenger-main">
        {view === 'chats' && <Messenger profile={activeProfile} demoMode={!isSupabaseConfigured || isDemoOpen} />}
        {view === 'groups' && <DirectoryView title="Groups" description="Company rooms and project spaces." icon={Users} />}
        {view === 'users' && <PeopleDirectory />}
        {view === 'files' && <FilesWorkspace />}
        {view === 'admin' && <AdminWorkspace profile={activeProfile} />}
        {view === 'settings' && <SettingsWorkspace />}
      </main>
    </div>
  )
}

async function loadProfile(userId: string) {
  const client = supabase
  if (!client) throw new Error('Supabase is not configured.')

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data as Profile
}

function LoginScreen({
  error,
  onDemo,
  onError,
}: {
  error: string
  onDemo: () => void
  onError: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onError('')

    if (!supabase) {
      onDemo()
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) onError(signInError.message)
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">C</div>
        <h1>Connectra</h1>
        <p>Private company messenger for chat, employees, and files.</p>
        {!isSupabaseConfigured && (
          <button className="demo-button" onClick={onDemo} type="button">
            Open demo workspace
          </button>
        )}
        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              autoComplete="email"
              disabled={!isSupabaseConfigured}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@company.com"
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              disabled={!isSupabaseConfigured}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Rail({
  activeView,
  onViewChange,
  profile,
}: {
  activeView: View
  onViewChange: (view: View) => void
  profile: Profile
}) {
  const nav = [
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'users', label: 'Users', icon: UserRound },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  async function signOut() {
    await supabase?.auth.signOut()
    window.location.reload()
  }

  return (
    <aside className="rail">
      <div className="rail-brand">
        <div className="brand-mark">C</div>
      </div>
      <nav aria-label="Workspace">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            aria-label={label}
            className={clsx(activeView === id && 'active')}
            key={id}
            onClick={() => onViewChange(id)}
            title={label}
            type="button"
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-profile">
        <span className="online-ring">{getInitials(profile.full_name)}</span>
        <button aria-label="Sign out" onClick={signOut} title="Sign out" type="button">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  )
}

function Messenger({ profile, demoMode }: { profile: Profile; demoMode: boolean }) {
  const [users, setUsers] = useState<Profile[]>(demoUsers)
  const [conversations, setConversations] = useState<Conversation[]>(demoConversations)
  const [selectedConversationId, setSelectedConversationId] = useState(demoConversations[0].id)
  const [messages, setMessages] = useState<Message[]>(demoMessages)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (demoMode || !supabase) return

    setLoading(true)
    Promise.all([loadUsers(), loadConversations()])
      .then(([loadedUsers, loadedConversations]) => {
        setUsers(loadedUsers)
        setConversations(loadedConversations)
        if (loadedConversations[0]) setSelectedConversationId(loadedConversations[0].id)
        if (!loadedConversations.length) {
          setStatus('Company Lobby migration run karne ke baad live chat room dikhega.')
        }
      })
      .catch((error: Error) => setStatus(error.message))
      .finally(() => setLoading(false))
  }, [demoMode])

  useEffect(() => {
    if (demoMode || !supabase || !selectedConversationId) return

    loadMessages(selectedConversationId)
      .then(setMessages)
      .catch((error: Error) => setStatus(error.message))

    const client = supabase
    if (!client) {
      return undefined
    }

    const channel = client
      .channel(`messages:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        () => {
          loadMessages(selectedConversationId).then(setMessages).catch((error: Error) => setStatus(error.message))
        },
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [demoMode, selectedConversationId])

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId)
  const activeMessages = messages.filter((message) => message.conversation_id === selectedConversationId)
  const filteredUsers = users.filter((user) => {
    const value = `${user.full_name} ${user.email}`.toLowerCase()
    return value.includes(query.toLowerCase())
  })

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if ((!body && !selectedFile) || !selectedConversationId || uploading) return

    if (demoMode || !supabase) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          conversation_id: selectedConversationId,
          sender_id: profile.id,
          sender_name: profile.full_name,
          body: body || selectedFile?.name || 'Attachment',
          created_at: new Date().toISOString(),
          attachment_name: selectedFile?.name,
          attachment_path: selectedFile ? `demo/${selectedFile.name}` : undefined,
        },
      ])
      setDraft('')
      setSelectedFile(null)
      return
    }

    setStatus('')
    setUploading(Boolean(selectedFile))

    try {
      const attachment = selectedFile ? await uploadAttachment(selectedFile, selectedConversationId, profile.id) : null
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversationId,
          sender_id: profile.id,
          body: body || attachment?.name || 'Attachment',
          client_generated_id: crypto.randomUUID(),
        })
        .select('id')
        .single()

      if (messageError) throw messageError

      if (attachment) {
        const { error: attachmentError } = await supabase.from('attachments').insert({
          message_id: message.id,
          uploader_id: profile.id,
          object_path: attachment.path,
          file_name: attachment.name,
          mime_type: attachment.type,
          size_bytes: attachment.size,
        })

        if (attachmentError) throw attachmentError
      }

      setDraft('')
      setSelectedFile(null)
      setMessages(await loadMessages(selectedConversationId))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Message send nahi ho paya.')
    } finally {
      setUploading(false)
    }
  }

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      setStatus('File 25 MB se chhoti honi chahiye.')
      event.target.value = ''
      return
    }

    setStatus('')
    setSelectedFile(file)
    event.target.value = ''
  }

  async function openAttachment(message: Message) {
    if (demoMode || !message.attachment_path || !supabase) return

    const { data, error } = await supabase.storage.from('chat-attachments').createSignedUrl(message.attachment_path, 60)
    if (error) {
      setStatus(error.message)
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="chat-product">
      <aside className="roster-panel">
        <div className="roster-top">
          <button aria-label="Toggle sidebar" className="ghost-icon" type="button">
            <Menu size={23} />
          </button>
          <div>
            <strong>Connectra</strong>
            <span>{demoMode ? 'Demo workspace' : 'Live workspace'}</span>
          </div>
        </div>

        <div className="roster-search">
          <Search size={17} />
          <input aria-label="Search users" onChange={(event) => setQuery(event.target.value)} placeholder="Search" value={query} />
        </div>

        <div className="mini-tabs">
          {conversations.map((conversation) => (
            <button
              className={clsx(conversation.id === selectedConversationId && 'active')}
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              type="button"
            >
              {conversation.title ?? 'Untitled'}
            </button>
          ))}
        </div>

        <div className="people-list">
          {filteredUsers.map((user, index) => (
            <article key={user.id}>
              <span className={clsx('presence-dot', index % 5 === 0 && 'busy', user.status === 'suspended' && 'offline')} />
              <div>
                <strong>{user.full_name}</strong>
                <small>{user.role === 'admin' ? 'Workspace admin' : user.email}</small>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <section className="conversation-panel">
        <header className="conversation-topbar">
          <div className="chat-identity">
            <span className="large-avatar">{getInitials(selectedConversation?.title ?? 'CL')}</span>
            <div>
              <h1>{selectedConversation?.title ?? 'Company Lobby'}</h1>
              <p>{users.length} employees available</p>
            </div>
          </div>
          <div className="conversation-actions">
            <button aria-label="Search messages" className="round-tool" type="button">
              <Search size={21} />
            </button>
            <button aria-label="Add people" className="round-tool" type="button">
              <Users size={21} />
            </button>
            <button aria-label="Attach file" className="round-tool" onClick={() => fileInputRef.current?.click()} type="button">
              <Paperclip size={21} />
            </button>
          </div>
        </header>

        <div className="message-canvas">
          <div className="date-divider">
            <span>Today</span>
          </div>
          {loading && <p className="soft-status">Loading workspace...</p>}
          {status && <p className="soft-status">{status}</p>}
          {!activeMessages.length && !loading && <p className="soft-status">No messages yet. Start the conversation.</p>}
          {activeMessages.map((message) => (
            <article className={clsx('chat-bubble', message.sender_id === profile.id && 'own')} key={message.id}>
              <div className="bubble-meta">
                <strong>{message.sender_name}</strong>
                <time>{formatTime(message.created_at)}</time>
              </div>
              <p>{message.body}</p>
              {message.attachment_name && (
                <button className="attachment-pill" onClick={() => openAttachment(message)} type="button">
                  <FileText size={15} />
                  {message.attachment_name}
                </button>
              )}
              {message.sender_id === profile.id && <CheckCheck className="read-check" size={15} />}
            </article>
          ))}
        </div>

        <form className="message-composer" onSubmit={sendMessage}>
          <button aria-label="Emoji" className="round-tool" type="button">
            <Smile size={22} />
          </button>
          <div className="composer-input">
            <input
              aria-label="Message"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={selectedFile ? 'Add a caption' : 'Type a message'}
              value={draft}
            />
            {selectedFile && (
              <button className="selected-file" onClick={() => setSelectedFile(null)} type="button">
                <FileText size={14} />
                {selectedFile.name}
              </button>
            )}
          </div>
          <button aria-label="AI assist" className="ai-tool" type="button">
            <Sparkles size={22} />
          </button>
          <input className="hidden-file-input" onChange={pickFile} ref={fileInputRef} type="file" />
          <button aria-label="Attach file" className="round-tool" onClick={() => fileInputRef.current?.click()} type="button">
            <Paperclip size={22} />
          </button>
          <button aria-label="Send" className="send-tool" disabled={uploading} type="submit">
            <Send size={21} />
          </button>
        </form>
      </section>
    </section>
  )
}

async function loadUsers() {
  const client = supabase
  if (!client) return demoUsers

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, status')
    .order('full_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Profile[]
}

async function loadConversations() {
  const client = supabase
  if (!client) return demoConversations

  const { data, error } = await client
    .from('conversations')
    .select('id, title, type, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Conversation[]
}

async function loadMessages(conversationId: string) {
  const client = supabase
  if (!client) return demoMessages

  const { data, error } = await client
    .from('messages')
    .select(
      'id, conversation_id, sender_id, body, created_at, profiles!messages_sender_id_fkey(full_name), attachments(file_name, object_path)',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((message) => {
    const profileData = message.profiles as { full_name?: string } | null
    const attachmentData = (message.attachments as { file_name?: string; object_path?: string }[] | null)?.[0]
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_name: profileData?.full_name ?? 'Employee',
      body: message.body,
      created_at: message.created_at,
      attachment_name: attachmentData?.file_name,
      attachment_path: attachmentData?.object_path,
    }
  }) as Message[]
}

async function uploadAttachment(file: File, conversationId: string, userId: string) {
  const client = supabase
  if (!client) throw new Error('Supabase configure nahi hai.')

  const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
  const path = `${userId}/${conversationId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from('chat-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  return {
    name: file.name,
    path,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

function PeopleDirectory() {
  return <DirectoryView title="Users" description="Search employees and online status from the chat roster." icon={UserRound} />
}

function FilesWorkspace() {
  const files = demoMessages.filter((message) => message.attachment_name)

  return (
    <section className="content-surface">
      <SectionHeader title="Shared files" description="Attachments shared across the workspace." icon={Archive} />
      <div className="file-grid">
        {files.map((file) => (
          <article className="file-card" key={file.id}>
            <FileText size={25} />
            <strong>{file.attachment_name}</strong>
            <span>{file.sender_name}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function AdminWorkspace({ profile }: { profile: Profile }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Profile[]>(demoUsers)

  useEffect(() => {
    if (!supabase) return
    loadUsers().then(setUsers).catch((error: Error) => setStatus(error.message))
  }, [])

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      fullName: String(form.get('fullName') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      password: String(form.get('password') ?? '').trim(),
      role: String(form.get('role') ?? 'employee'),
    }

    if (!supabase) {
      setStatus('Demo mode: Supabase setup ke baad employee create hoga.')
      return
    }

    setLoading(true)
    const { error } = await supabase.functions.invoke('create-employee', { body: payload })
    setLoading(false)

    if (error) {
      setStatus(error.message)
      return
    }

    setStatus('Employee created successfully.')
    loadUsers().then(setUsers).catch((loadError: Error) => setStatus(loadError.message))
    event.currentTarget.reset()
  }

  return (
    <section className="content-surface">
      <SectionHeader title="Admin control" description="Only admins can create employee accounts." icon={ShieldCheck} />
      {profile.role !== 'admin' ? (
        <div className="empty-state">
          <ShieldCheck size={26} />
          <strong>Admin access required</strong>
        </div>
      ) : (
        <div className="admin-grid">
          <form className="admin-form" onSubmit={createEmployee}>
            <label>
              Full name
              <input name="fullName" placeholder="Employee name" required />
            </label>
            <label>
              Email
              <input name="email" placeholder="employee@company.com" required type="email" />
            </label>
            <label>
              Temporary password
              <input minLength={8} name="password" placeholder="Minimum 8 characters" required type="password" />
            </label>
            <label>
              Role
              <select name="role">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {status && <p className="form-note">{status}</p>}
            <button className="primary-button" disabled={loading} type="submit">
              <Users size={16} />
              {loading ? 'Creating...' : 'Add employee'}
            </button>
          </form>
          <UserList users={users} />
        </div>
      )}
    </section>
  )
}

function UserList({ users }: { users: Profile[] }) {
  return (
    <div className="user-list">
      {users.map((user) => (
        <article key={user.id}>
          <div className="avatar">{getInitials(user.full_name)}</div>
          <div>
            <strong>{user.full_name}</strong>
            <span>{user.email}</span>
          </div>
          <em>{user.role}</em>
        </article>
      ))}
    </div>
  )
}

function SettingsWorkspace() {
  return (
    <section className="content-surface">
      <SectionHeader title="Workspace settings" description="Deployment and storage overview." icon={Settings} />
      <div className="settings-list">
        <article>
          <strong>Hosting</strong>
          <span>Cloudflare Pages</span>
        </article>
        <article>
          <strong>Database and auth</strong>
          <span>Supabase</span>
        </article>
        <article>
          <strong>File storage</strong>
          <span>Supabase Storage first, Cloudflare R2 later if needed</span>
        </article>
      </div>
    </section>
  )
}

function DirectoryView({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: typeof Users
}) {
  return (
    <section className="content-surface">
      <SectionHeader title={title} description={description} icon={Icon} />
      <div className="empty-state">
        <Star size={24} />
        <strong>This section is ready for the next workflow.</strong>
      </div>
    </section>
  )
}

function SectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: typeof Users
}) {
  return (
    <header className="section-heading">
      <div className="section-title">
        <Icon size={24} />
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
    </header>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export default App
