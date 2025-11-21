import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UserPlus, MessageCircle } from 'lucide-react';

interface RecommendedUser {
  id: string;
  username: string;
  avatar_url?: string;
  shared_interests: number;
  mutual_friends: number;
  interests: string[];
}

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Get user's interests
    const { data: userInterests } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);

    const userInterestIds = userInterests?.map(ui => ui.interest_id) || [];

    // Get all other users
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id);

    if (!allProfiles) {
      setLoading(false);
      return;
    }

    // Calculate recommendations
    const recommendationsWithScores = await Promise.all(
      allProfiles.map(async (profile) => {
        // Get their interests
        const { data: theirInterests } = await supabase
          .from('user_interests')
          .select(`
            interest_id,
            interests (name)
          `)
          .eq('user_id', profile.id);

        const theirInterestIds = theirInterests?.map(ui => ui.interest_id) || [];
        const sharedInterests = userInterestIds.filter(id => 
          theirInterestIds.includes(id)
        ).length;

        // Get mutual friends
        const { data: userFriends } = await supabase
          .from('friendships')
          .select('following_id')
          .eq('follower_id', user.id);

        const { data: theirFriends } = await supabase
          .from('friendships')
          .select('following_id')
          .eq('follower_id', profile.id);

        const userFriendIds = userFriends?.map(f => f.following_id) || [];
        const theirFriendIds = theirFriends?.map(f => f.following_id) || [];
        const mutualFriends = userFriendIds.filter(id => 
          theirFriendIds.includes(id)
        ).length;

        return {
          ...profile,
          shared_interests: sharedInterests,
          mutual_friends: mutualFriends,
          interests: theirInterests?.map(i => i.interests.name) || [],
          score: sharedInterests * 2 + mutualFriends,
        };
      })
    );

    // Sort by score and filter out users with no connections
    const sorted = recommendationsWithScores
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setRecommendations(sorted);
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        follower_id: user.id,
        following_id: userId,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to follow user',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Now following!',
      });
      fetchRecommendations();
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
          <h1 className="text-2xl font-bold">Friend Recommendations</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Finding friends for you...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <Card className="p-12 text-center shadow-soft">
            <p className="text-muted-foreground mb-4">
              No recommendations yet. Add more interests to find friends!
            </p>
            <Link to="/interests">
              <Button>Add Interests</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {recommendations.map((user) => (
              <Card key={user.id} className="p-6 shadow-soft hover:shadow-medium transition-shadow">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{user.username}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.shared_interests > 0 && (
                        <Badge variant="secondary">
                          {user.shared_interests} shared interest{user.shared_interests > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {user.mutual_friends > 0 && (
                        <Badge variant="secondary">
                          {user.mutual_friends} mutual friend{user.mutual_friends > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.interests.slice(0, 5).map((interest, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => handleFollow(user.id)} size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </Button>
                    <Link to="/messages">
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;