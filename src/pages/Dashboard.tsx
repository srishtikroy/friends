import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, User as UserIcon, Send, UserPlus, LogOut, Users } from 'lucide-react';

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
  user_id: string;
  profiles: Profile;
}

const Dashboard = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchPosts();

    // Set up realtime subscription for posts
    const channel = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
                <Link to="/friends">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Friends
                  </Button>
                </Link>
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
              <CreatePostDialog onPostCreated={fetchPosts} />
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-6 shadow-soft hover:shadow-medium transition-shadow">
                  <div className="flex items-start gap-4">
                    <Link to={`/user/${post.user_id}`}>
                      <Avatar className="cursor-pointer">
                        <AvatarImage src={post.profiles.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {post.profiles.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link to={`/user/${post.user_id}`}>
                          <h3 className="font-semibold hover:underline cursor-pointer">{post.profiles.username}</h3>
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {post.content && <p className="text-foreground whitespace-pre-wrap mb-3">{post.content}</p>}
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="rounded-lg max-h-[500px] w-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {posts.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No posts yet. Create your first post or follow some friends to see their posts!
                  </p>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;