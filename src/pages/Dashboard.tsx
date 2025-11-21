import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Bell, User as UserIcon, Send, UserPlus, LogOut } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profiles: Profile;
}

const Dashboard = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchPosts();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCurrentUser(profile);
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } else {
      setPosts(data || []);
    }
  };

  const createPost = async () => {
    if (!newPost.trim() || !currentUser) return;

    setLoading(true);

    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: currentUser.id,
        content: newPost.trim(),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Post created!',
      });
      setNewPost('');
      fetchPosts();
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">SocialNet</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <UserIcon className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <aside className="space-y-4">
            <Card className="p-6 shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={currentUser?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {currentUser?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{currentUser?.username}</h3>
                  <Link to="/profile" className="text-sm text-primary hover:underline">
                    View Profile
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <Link to="/recommendations">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Find Friends
                  </Button>
                </Link>
                <Link to="/messages">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                </Link>
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <Card className="p-6 shadow-soft">
              <h2 className="text-lg font-semibold mb-4">What's on your mind?</h2>
              <Textarea
                placeholder="Share something..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="mb-4 resize-none"
                rows={3}
              />
              <Button onClick={createPost} disabled={loading || !newPost.trim()} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Posting...' : 'Post'}
              </Button>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-6 shadow-soft hover:shadow-medium transition-shadow">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {post.profiles.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{post.profiles.username}</h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="mt-4 rounded-lg max-w-full"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;