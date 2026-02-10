import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FiSend, FiUser } from 'react-icons/fi';
import { createNotification } from '../lib/notifications';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sent_by: string;
  sent_to: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
  };
  receiver?: {
    full_name: string;
    email: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function Messages() {
  const { user, isSubUser, subUser, profile } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getCurrentUserId = () => isSubUser && subUser ? subUser.id : user?.id;
  const getCurrentUserName = () => isSubUser && subUser ? subUser.full_name : profile?.full_name || user?.email || '';

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchAllMessages();
      const subscription = setupRealtimeSubscription();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (allMessages.length > 0 && users.length > 0) {
      fetchUsers();
    }
  }, [allMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    const currentUserId = getCurrentUserId();
    return supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sent_to=eq.${currentUserId}`
      }, () => {
        fetchAllMessages();
        if (selectedUser) {
          fetchMessages(selectedUser.id);
        }
      })
      .subscribe();
  };

  const fetchAllMessages = async () => {
    try {
      const currentUserId = getCurrentUserId();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sent_by.eq.${currentUserId},sent_to.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllMessages(data || []);
    } catch (error) {
      console.error('Error fetching all messages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const currentUserId = getCurrentUserId();

      // Récupérer les profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role');

      if (profilesError) throw profilesError;

      // Récupérer les sub_users
      const { data: subUsersData, error: subUsersError } = await supabase
        .from('sub_users')
        .select('id, full_name, username, role');

      if (subUsersError) throw subUsersError;

      // Combiner les deux listes et exclure l'utilisateur actuel
      const allUsers = [
        ...(profilesData || []).filter(p => p.id !== currentUserId),
        ...(subUsersData || [])
          .filter(su => su.id !== currentUserId)
          .map(su => ({
            id: su.id,
            full_name: su.full_name,
            email: su.username,
            role: su.role
          }))
      ];

      // Trier: les utilisateurs avec des messages non lus d'abord, puis par nom
      const sortedUsers = allUsers.sort((a, b) => {
        const aHasUnread = allMessages.some(m => m.sent_by === a.id && m.sent_to === currentUserId && !m.is_read);
        const bHasUnread = allMessages.some(m => m.sent_by === b.id && m.sent_to === currentUserId && !m.is_read);

        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;

        return a.full_name.localeCompare(b.full_name);
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const currentUserId = getCurrentUserId();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sent_by.eq.${currentUserId},sent_to.eq.${otherUserId}),and(sent_by.eq.${otherUserId},sent_to.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrichir avec les infos utilisateurs
      const enrichedMessages = await Promise.all((data || []).map(async (msg) => {
        const sender = users.find(u => u.id === msg.sent_by);
        const receiver = users.find(u => u.id === msg.sent_to);

        return {
          ...msg,
          sender: sender ? { full_name: sender.full_name, email: sender.email } : undefined,
          receiver: receiver ? { full_name: receiver.full_name, email: receiver.email } : undefined
        };
      }));

      setMessages(enrichedMessages);

      const unreadMessages = data?.filter(m => m.sent_to === currentUserId && !m.is_read) || [];
      for (const msg of unreadMessages) {
        await markAsRead(msg.id);
      }

      if (unreadMessages.length > 0) {
        fetchAllMessages();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedUser || !user) return;

    try {
      const currentUserId = getCurrentUserId();
      const currentUserName = getCurrentUserName();

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sent_by: currentUserId,
          sent_to: selectedUser.id
        });

      if (error) throw error;

      await createNotification(selectedUser.id, {
        type: 'message',
        title: 'Nouveau message',
        message: `${currentUserName} vous a envoyé un message`
      });

      setNewMessage('');
      fetchAllMessages();
      fetchMessages(selectedUser.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  const getUnreadCount = (userId: string) => {
    const currentUserId = getCurrentUserId();
    return allMessages.filter(m => m.sent_by === userId && m.sent_to === currentUserId && !m.is_read).length;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Messagerie
        </h1>
        <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
          Communiquez avec votre équipe en temps réel
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 300px)' }}>
        <div className="card" style={{ width: 320, display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--gray-200)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Contacts</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{users.length} employé{users.length > 1 ? 's' : ''}</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {users.map((u) => {
              const unreadCount = getUnreadCount(u.id);
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isSelected ? 'var(--gray-50)' : 'white',
                    borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                  }}>
                    <FiUser size={20} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.full_name}
                      </p>
                      {unreadCount > 0 && (
                        <span className="badge badge-success" style={{ fontSize: 12, padding: '2px 8px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
          {selectedUser ? (
            <>
              <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--gray-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}>
                    <FiUser size={20} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--gray-900)' }}>{selectedUser.full_name}</p>
                    <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)', background: 'var(--gray-50)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {messages.map((message) => {
                    const currentUserId = getCurrentUserId();
                    const isSent = message.sent_by === currentUserId;
                    return (
                      <div key={message.id} style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-lg)',
                          background: isSent ? 'var(--primary)' : 'white',
                          color: isSent ? 'white' : 'var(--gray-900)',
                          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        }}>
                          <p style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {message.content}
                          </p>
                          <p style={{
                            fontSize: 12,
                            marginTop: 4,
                            opacity: 0.8,
                          }}>
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form onSubmit={sendMessage} style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--gray-200)', background: 'white' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px' }}
                  >
                    <FiSend size={18} />
                    Envoyer
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>
              <div style={{ textAlign: 'center' }}>
                <FiUser size={64} style={{ marginBottom: 16, color: 'var(--gray-300)' }} />
                <p style={{ fontSize: 16 }}>Sélectionnez un contact pour commencer une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
