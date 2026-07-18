import {
  AlertCircle,
  Archive,
  Bell,
  FileText,
  LogOut,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { isSupabaseConfigured, supabase } from './lib/supabase/client'
import './index.css'

type View = 'chats' | 'files' | 'admin' | 'settings'
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
  title: string
  last_message: string
  unread: number
}

type Message = {
  id: string
  conversation_id: string
  sender_name: string
  body: string
  created_at: string
  attachment_name?: string
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
  {
    id: 'u-2',
    full_name: 'Neha Sharma',
    email: 'neha@company.local',
    role: 'employee',
    status: 'active',
  },
  {
    id: 'u-3',
    full_name: 'Rahul Meena',
    email: 'rahul@company.local',
    role: 'employee',
    status: 'active',
  },
]

const demoConversations: Conversation[] = [
  {
    id: 'general',
    title: 'General',
    last_message: 'Client invoice PDF shared',
    unread: 2,
  },
  {
    id: 'ops',
    title: 'Operations',
    last_message: 'Delivery schedule updated',
    unread: 0,
  },
]

const demoMessages: Message[] = [
  {
    id: 'm-1',
    conversation_id: 'general',
    sender_name: 'Neha Sharma',
    body: 'Aaj ki meeting notes yahan share kar diye hain.',
    created_at: '10:18 AM',
    attachment_name: 'meeting-notes.pdf',
  },
  {
    id: 'm-2',
    conversation_id: 'general',
    sender_name: 'Vaibhav Pareek',
    body: 'Theek hai. Admin panel se main new employee add kar dunga.',
    created_at: '10:23 AM',
  },
  {
    id: 'm-3',
    conversation_id: 'ops',
    sender_name: 'Rahul Meena',
    body: 'Delivery schedule update ho gaya hai.',
    created_at: '11:04 AM',
    attachment_name: 'schedule.xlsx',
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

      client
        .from('profiles')
        .select('id, full_name, email, role, status')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profileData, error }) => {
          if (error) {
            setAuthError(error.message)
            return
          }
          setProfile(profileData as Profile)
        })
    })

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null)
        return
      }

      client
        .from('profiles')
        .select('id, full_name, email, role, status')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            setAuthError(error.message)
            return
          }
          setProfile(data as Profile)
        })
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const activeProfile = profile ?? (isDemoOpen ? demoProfile : null)

  if (!activeProfile) {
    return (
      <LoginScreen
        error={authError}
        onDemo={() => setIsDemoOpen(true)}
        onError={setAuthError}
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={view} onViewChange={setView} profile={activeProfile} />
      <main className="workspace">
        <TopBar profile={activeProfile} demoMode={!isSupabaseConfigured || isDemoOpen} />
        {view === 'chats' && <ChatWorkspace profile={activeProfile} demoMode={!isSupabaseConfigured || isDemoOpen} />}
        {view === 'files' && <FilesWorkspace />}
        {view === 'admin' && <AdminWorkspace profile={activeProfile} />}
        {view === 'settings' && <SettingsWorkspace />}
      </main>
    </div>
  )
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
        <p>Private team chat and file sharing for your workplace.</p>

        {!isSupabaseConfigured && (
          <div className="notice">
            <AlertCircle size={18} />
            Supabase keys add karne ke baad real login enable hoga. Abhi demo mode available hai.
          </div>
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
            {loading ? 'Signing in...' : isSupabaseConfigured ? 'Sign in' : 'Open demo workspace'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Sidebar({
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
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">C</div>
        <div>
          <strong>Connectra</strong>
          <span>Company workspace</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            className={clsx(activeView === id && 'active')}
            key={id}
            onClick={() => onViewChange(id)}
            type="button"
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-profile">
        <div className="avatar">{getInitials(profile.full_name)}</div>
        <div>
          <strong>{profile.full_name}</strong>
          <span>{profile.role}</span>
        </div>
      </div>
    </aside>
  )
}

function TopBar({ profile, demoMode }: { profile: Profile; demoMode: boolean }) {
  async function signOut() {
    await supabase?.auth.signOut()
    window.location.reload()
  }

  return (
    <header className="topbar">
      <div>
        <h2>Good day, {profile.full_name.split(' ')[0]}</h2>
        <p>{demoMode ? 'Demo workspace' : 'Live Supabase workspace'}</p>
      </div>
      <div className="topbar-actions">
        <button aria-label="Notifications" className="icon-button" type="button">
          <Bell size={18} />
        </button>
        <button aria-label="Sign out" className="icon-button" onClick={signOut} type="button">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

function ChatWorkspace({ profile, demoMode }: { profile: Profile; demoMode: boolean }) {
  const [selectedConversationId, setSelectedConversationId] = useState(demoConversations[0].id)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(demoMessages)
  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversation_id === selectedConversationId),
    [messages, selectedConversationId],
  )

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        conversation_id: selectedConversationId,
        sender_name: profile.full_name,
        body,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setDraft('')
  }

  return (
    <section className="chat-layout">
      <aside className="conversation-list">
        <div className="search-box">
          <Search size={16} />
          <input aria-label="Search chats" placeholder="Search chats" />
        </div>
        {demoConversations.map((conversation) => (
          <button
            className={clsx(selectedConversationId === conversation.id && 'selected')}
            key={conversation.id}
            onClick={() => setSelectedConversationId(conversation.id)}
            type="button"
          >
            <span>
              <strong>{conversation.title}</strong>
              <small>{conversation.last_message}</small>
            </span>
            {conversation.unread > 0 && <em>{conversation.unread}</em>}
          </button>
        ))}
      </aside>

      <section className="message-panel">
        <div className="message-header">
          <div>
            <h3>{demoConversations.find((item) => item.id === selectedConversationId)?.title}</h3>
            <p>{demoMode ? 'Demo messages' : 'Realtime messages after Supabase setup'}</p>
          </div>
          <button className="secondary-button" type="button">
            <Plus size={16} />
            New chat
          </button>
        </div>

        <div className="message-list" aria-live="polite">
          {activeMessages.map((message) => (
            <article
              className={clsx('message-bubble', message.sender_name === profile.full_name && 'own')}
              key={message.id}
            >
              <div>
                <strong>{message.sender_name}</strong>
                <time>{message.created_at}</time>
              </div>
              <p>{message.body}</p>
              {message.attachment_name && (
                <button className="attachment-chip" type="button">
                  <Paperclip size={14} />
                  {message.attachment_name}
                </button>
              )}
            </article>
          ))}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <button aria-label="Attach file" className="icon-button" type="button">
            <Paperclip size={18} />
          </button>
          <input
            aria-label="Message"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message"
            value={draft}
          />
          <button aria-label="Send message" className="send-button" type="submit">
            <Send size={18} />
          </button>
        </form>
      </section>
    </section>
  )
}

function FilesWorkspace() {
  const files = demoMessages.filter((message) => message.attachment_name)

  return (
    <section className="content-surface">
      <div className="section-heading">
        <div>
          <h3>Shared files</h3>
          <p>All attachments shared in company chats.</p>
        </div>
        <button className="secondary-button" type="button">
          <Archive size={16} />
          Archive selected
        </button>
      </div>
      <div className="file-grid">
        {files.map((file) => (
          <article className="file-card" key={file.id}>
            <FileText size={24} />
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
    setStatus(error ? error.message : 'Employee created successfully.')
  }

  return (
    <section className="content-surface">
      <div className="section-heading">
        <div>
          <h3>Employees</h3>
          <p>Only admins can add or suspend employee accounts.</p>
        </div>
      </div>

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

          <div className="user-list">
            {demoUsers.map((user) => (
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
        </div>
      )}
    </section>
  )
}

function SettingsWorkspace() {
  return (
    <section className="content-surface">
      <div className="section-heading">
        <div>
          <h3>Workspace settings</h3>
          <p>Free-tier limits, storage rules, and deployment setup.</p>
        </div>
      </div>
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default App
