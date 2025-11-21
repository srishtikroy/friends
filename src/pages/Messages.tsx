import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
}

interface Conversation {
  otherUser: Profile;
  lastMessage?: Message;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    initializeMessages();
  }, []);

  useEffect(() => {
    if (selectedUser && currentUserId) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser, currentUserId]);

  const initializeMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    setCurrentUserId(user.id);
    fetchConversations(user.id);
  };

  const fetchConversations = async (userId: string) => {
    const { data: messageData } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!messageData) return;

    // Get unique user IDs
    const userIds = new Set<string>();
    messageData.forEach(msg => {
      if (msg.sender_id !== userId) userIds.add(msg.sender_id);
      if (msg.recipient_id !== userId) userIds.add(msg.recipient_id);
    });

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(userIds));

    if (!profiles) return;

    // Create conversations
    const convos: Conversation[] = profiles.map(profile => {
      const lastMsg = messageData.find(msg =>
        (msg.sender_id === profile.id || msg.recipient_id === profile.id)
      );
      return {
        otherUser: profile,
        lastMessage: lastMsg,
      };
    });

    setConversations(convos);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUserId,
        recipient_id: selectedUser.id,
        content: newMessage.trim(),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
      fetchMessages(selectedUser.id);
      fetchConversations(currentUserId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {/* Conversations List */}
          <Card className="md:col-span-1 p-4 shadow-soft overflow-y-auto">
            <h2 className="font-semibold mb-4">Conversations</h2>
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.otherUser.id}
                  onClick={() => setSelectedUser(conv.otherUser)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                    selectedUser?.id === conv.otherUser.id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={conv.otherUser.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {conv.otherUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conv.otherUser.username}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col shadow-soft">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{selectedUser.username}</h3>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender_id === currentUserId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;