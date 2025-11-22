import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search, UserPlus, UserMinus } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  friendship_id?: string;
}

const Friends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    initializeFriends();
  }, []);

  const initializeFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    setCurrentUserId(user.id);
    fetchFriends(user.id);
  };

  const fetchFriends = async (userId: string) => {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, following_id')
      .eq('follower_id', userId);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      return;
    }

    const friendIds = friendships.map(f => f.following_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio')
      .in('id', friendIds);

    if (profiles) {
      const friendsWithId = profiles.map(profile => {
        const friendship = friendships.find(f => f.following_id === profile.id);
        return {
          ...profile,
          friendship_id: friendship?.id,
        };
      });
      setFriends(friendsWithId);
    }
  };

  const handleUnfollow = async (friendId: string, friendshipId?: string) => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId || '');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to unfollow user',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Unfollowed successfully',
      });
      fetchFriends(currentUserId);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold">Friends</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Friends List */}
        <div className="space-y-4">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <Card key={friend.id} className="p-4 shadow-soft hover:shadow-medium transition-shadow">
                <div className="flex items-center gap-4">
                  <Link to={`/user/${friend.id}`}>
                    <Avatar className="w-16 h-16 cursor-pointer">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {friend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/user/${friend.id}`}>
                      <h3 className="font-semibold text-lg hover:underline cursor-pointer">
                        {friend.username}
                      </h3>
                    </Link>
                    {friend.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {friend.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages?user=${friend.id}`)}
                    >
                      Message
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnfollow(friend.id, friend.friendship_id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No friends found matching your search' : 'No friends yet. Visit Recommendations to find people to follow!'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
