import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiPlus, FiCheck, FiClock, FiMessageSquare, FiSend } from 'react-icons/fi'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Profile {
  id: string
  full_name: string
  role: string
}

interface Task {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  created_by: string
  completed_at: string | null
  assigned_profile?: Profile
  creator_profile?: Profile
}

interface Message {
  id: string
  content: string
  sent_by: string
  sent_to: string | null
  task_id: string | null
  is_read: boolean
  created_at: string
  sender_profile?: Profile
  recipient_profile?: Profile
}

export default function Tasks() {
  const { profile } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'tasks' | 'messages'>('tasks')
  const [taskFilter, setTaskFilter] = useState<'all' | 'assigned' | 'created'>('all')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')

  const [messageContent, setMessageContent] = useState('')
  const [messageRecipient, setMessageRecipient] = useState('')
  const [messageTask, setMessageTask] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchTasks()
    fetchMessages()
  }, [profile])

  const fetchUsers = async () => {
    try {
      // Récupérer les profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')

      if (profilesError) throw profilesError

      // Récupérer les sub_users
      const { data: subUsersData, error: subUsersError } = await supabase
        .from('sub_users')
        .select('id, full_name, role')
        .order('full_name')

      if (subUsersError) throw subUsersError

      // Combiner les deux listes
      const allUsers = [
        ...(profilesData || []),
        ...(subUsersData || []).map(su => ({
          id: su.id,
          full_name: su.full_name,
          role: su.role
        }))
      ]

      setUsers(allUsers)
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrichir avec les infos utilisateurs depuis profiles et sub_users
      const enrichedTasks = await Promise.all((data || []).map(async (task) => {
        let assignedProfile = null;
        let creatorProfile = null;

        if (task.assigned_to) {
          // Chercher dans profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', task.assigned_to)
            .maybeSingle();

          if (profile) {
            assignedProfile = profile;
          } else {
            // Chercher dans sub_users
            const { data: subUser } = await supabase
              .from('sub_users')
              .select('id, full_name, role')
              .eq('id', task.assigned_to)
              .maybeSingle();

            if (subUser) {
              assignedProfile = subUser;
            }
          }
        }

        if (task.created_by) {
          // Chercher dans profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', task.created_by)
            .maybeSingle();

          if (profile) {
            creatorProfile = profile;
          } else {
            // Chercher dans sub_users
            const { data: subUser } = await supabase
              .from('sub_users')
              .select('id, full_name, role')
              .eq('id', task.created_by)
              .maybeSingle();

            if (subUser) {
              creatorProfile = subUser;
            }
          }
        }

        return {
          ...task,
          assigned_profile: assignedProfile,
          creator_profile: creatorProfile
        };
      }));

      setTasks(enrichedTasks)
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrichir avec les infos utilisateurs depuis profiles et sub_users
      const enrichedMessages = await Promise.all((data || []).map(async (msg) => {
        let senderProfile = null;
        let recipientProfile = null;

        // Chercher l'expéditeur
        const { data: senderFromProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', msg.sent_by)
          .maybeSingle();

        if (senderFromProfiles) {
          senderProfile = senderFromProfiles;
        } else {
          const { data: senderFromSubUsers } = await supabase
            .from('sub_users')
            .select('id, full_name, role')
            .eq('id', msg.sent_by)
            .maybeSingle();

          if (senderFromSubUsers) {
            senderProfile = senderFromSubUsers;
          }
        }

        // Chercher le destinataire
        if (msg.sent_to) {
          const { data: recipientFromProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', msg.sent_to)
            .maybeSingle();

          if (recipientFromProfiles) {
            recipientProfile = recipientFromProfiles;
          } else {
            const { data: recipientFromSubUsers } = await supabase
              .from('sub_users')
              .select('id, full_name, role')
              .eq('id', msg.sent_to)
              .maybeSingle();

            if (recipientFromSubUsers) {
              recipientProfile = recipientFromSubUsers;
            }
          }
        }

        return {
          ...msg,
          sender_profile: senderProfile,
          recipient_profile: recipientProfile
        };
      }));

      setMessages(enrichedMessages)
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    }
  }

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          assigned_to: assignedTo || null,
          priority,
          due_date: dueDate || null,
          created_by: profile!.id,
        })

      if (error) throw error

      alert('Tâche créée avec succès')
      resetTaskForm()
      fetchTasks()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sent_by: profile!.id,
          sent_to: messageRecipient || null,
          task_id: messageTask || null,
        })

      if (error) throw error

      alert('Message envoyé avec succès')
      resetMessageForm()
      fetchMessages()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error

      fetchTasks()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleMarkMessageRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)

      if (error) throw error

      fetchMessages()
    } catch (error: any) {
      console.error('Erreur:', error)
    }
  }

  const resetTaskForm = () => {
    setShowTaskForm(false)
    setTitle('')
    setDescription('')
    setAssignedTo('')
    setPriority('medium')
    setDueDate('')
  }

  const resetMessageForm = () => {
    setShowMessageForm(false)
    setMessageContent('')
    setMessageRecipient('')
    setMessageTask('')
  }

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'assigned') return task.assigned_to === profile?.id
    if (taskFilter === 'created') return task.created_by === profile?.id
    return true
  })

  const myMessages = messages.filter(
    (msg) => msg.sent_by === profile?.id || msg.sent_to === profile?.id || msg.sent_to === null
  )

  const unreadCount = myMessages.filter((msg) => !msg.is_read && msg.sent_to === profile?.id).length

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            Tâches et Messages
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            Organisez le travail et communiquez avec l'équipe
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowTaskForm(true)}
          >
            <FiPlus size={20} />
            Nouvelle tâche
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowMessageForm(true)}
          >
            <FiMessageSquare size={20} />
            Nouveau message
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('tasks')}
        >
          <FiCheck size={20} />
          Tâches ({filteredTasks.length})
        </button>
        <button
          className={`btn ${activeTab === 'messages' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('messages')}
        >
          <FiMessageSquare size={20} />
          Messages ({myMessages.length})
          {unreadCount > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: 8 }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tasks' && (
        <>
          <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <button
              className={`btn ${taskFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTaskFilter('all')}
            >
              Toutes
            </button>
            <button
              className={`btn ${taskFilter === 'assigned' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTaskFilter('assigned')}
            >
              Assignées à moi
            </button>
            <button
              className={`btn ${taskFilter === 'created' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTaskFilter('created')}
            >
              Créées par moi
            </button>
          </div>

          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {filteredTasks.map((task) => (
              <div key={task.id} className="card">
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                      {task.title}
                    </h3>
                    <span
                      className={`badge ${
                        task.priority === 'high'
                          ? 'badge-danger'
                          : task.priority === 'medium'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </span>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                    <p>
                      Créée par: {task.creator_profile?.full_name} •{' '}
                      {format(parseISO(task.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                    {task.assigned_profile && (
                      <p>Assignée à: {task.assigned_profile.full_name}</p>
                    )}
                    {task.due_date && (
                      <p>
                        <FiClock style={{ display: 'inline', marginRight: 4 }} />
                        Échéance: {format(parseISO(task.due_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                  {task.status === 'pending' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                      style={{ flex: 1 }}
                    >
                      <FiClock size={18} />
                      En cours
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                      style={{ flex: 1 }}
                    >
                      <FiCheck size={18} />
                      Terminer
                    </button>
                  )}
                  <span
                    className={`badge ${
                      task.status === 'completed'
                        ? 'badge-success'
                        : task.status === 'in_progress'
                        ? 'badge-warning'
                        : 'badge-info'
                    }`}
                    style={{ padding: '12px 16px' }}
                  >
                    {task.status === 'completed'
                      ? 'Terminée'
                      : task.status === 'in_progress'
                      ? 'En cours'
                      : 'En attente'}
                  </span>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
                  Aucune tâche
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'messages' && (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {myMessages.map((message) => {
            const isSentByMe = message.sent_by === profile?.id
            const isUnread = !message.is_read && message.sent_to === profile?.id

            return (
              <div
                key={message.id}
                className="card"
                style={{
                  borderLeft: isUnread ? '4px solid var(--primary)' : undefined,
                  background: isUnread ? 'var(--gray-50)' : 'white',
                }}
                onClick={() => {
                  if (isUnread) {
                    handleMarkMessageRead(message.id)
                  }
                }}
              >
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>
                        {isSentByMe ? 'Vous' : message.sender_profile?.full_name}
                        {' → '}
                        {message.sent_to === null
                          ? 'Tous'
                          : message.sent_to === profile?.id
                          ? 'Vous'
                          : message.recipient_profile?.full_name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                        {format(parseISO(message.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="badge badge-info">
                        Non lu
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 16, marginBottom: 8 }}>
                    {message.content}
                  </p>
                </div>
              </div>
            )
          })}

          {myMessages.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
              <FiMessageSquare size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
                Aucun message
              </p>
            </div>
          )}
        </div>
      )}

      {showTaskForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 600,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Nouvelle tâche
            </h2>

            <form onSubmit={handleSubmitTask}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Titre</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Assigner à</label>
                <select
                  className="input"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Non assigné</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Priorité</label>
                <select
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Date d'échéance</label>
                <input
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPlus size={20} />
                  Créer
                </button>
                <button type="button" className="btn btn-outline" onClick={resetTaskForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMessageForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 600,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Nouveau message
            </h2>

            <form onSubmit={handleSubmitMessage}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Destinataire</label>
                <select
                  className="input"
                  value={messageRecipient}
                  onChange={(e) => setMessageRecipient(e.target.value)}
                >
                  <option value="">Tous</option>
                  {users.filter((u) => u.id !== profile?.id).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Lié à une tâche (optionnel)</label>
                <select
                  className="input"
                  value={messageTask}
                  onChange={(e) => setMessageTask(e.target.value)}
                >
                  <option value="">Aucune</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Message</label>
                <textarea
                  className="input"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiSend size={20} />
                  Envoyer
                </button>
                <button type="button" className="btn btn-outline" onClick={resetMessageForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
