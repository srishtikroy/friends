import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageCircle, UserPlus, UserMinus } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
}

interface Interest {
  id: string;
  interests: {
    name: string;
  };
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    setCurrentUserId(user.id);

    if (userId === user.id) {
      navigate('/profile');
      return;
    }

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Check if following
    const { data: friendshipData } = await supabase
      .from('friendships')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();

    setIsFollowing(!!friendshipData);

    // Fetch interests
    const { data: interestsData } = await supabase
      .from('user_interests')
      .select(`
        id,
        interests (name)
      `)
      .eq('user_id', userId);

    if (interestsData) {
      setInterests(interestsData);
    }

    // Fetch posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postsData) {
      setPosts(postsData);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || !userId) return;

    if (isFollowing) {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to unfollow',
          variant: 'destructive',
        });
      } else {
        setIsFollowing(false);
        toast({
          title: 'Success',
          description: 'Unfollowed successfully',
        });
      }
    } else {
      const { error } = await supabase
        .from('friendships')
        .insert({
          follower_id: currentUserId,
          following_id: userId,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to follow',
          variant: 'destructive',
        });
      } else {
        setIsFollowing(true);
        toast({
          title: 'Success',
          description: 'Following successfully',
        });
      }
    }
  };

  const handleMessage = () => {
    navigate(`/messages?user=${userId}`);
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
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <Card className="p-8 shadow-medium mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {profile?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold mb-2">{profile?.username}</h2>
              {profile?.bio && <p className="text-muted-foreground mb-4">{profile.bio}</p>}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Button onClick={handleFollowToggle} className="gap-2">
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleMessage} className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Interests */}
        <Card className="p-6 shadow-soft mb-6">
          <h3 className="text-xl font-semibold mb-4">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((interest) => (
                <Badge key={interest.id} variant="secondary" className="px-4 py-2">
                  {interest.interests.name}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No interests added yet</p>
            )}
          </div>
        </Card>

        {/* Posts */}
        <Card className="p-6 shadow-soft">
          <h3 className="text-xl font-semibold mb-4">Posts ({posts.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-4 h-full flex items-center justify-center">
                    <p className="text-sm line-clamp-4 text-center">{post.content}</p>
                  </div>
                )}
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-8">
                No posts yet
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
