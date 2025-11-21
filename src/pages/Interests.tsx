import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check } from 'lucide-react';

interface Interest {
  id: string;
  name: string;
}

const Interests = () => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load interests',
        variant: 'destructive',
      });
    } else if (data) {
      setInterests(data);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const addCustomInterest = async () => {
    if (!customInterest.trim()) return;

    const { data, error } = await supabase
      .from('interests')
      .insert({ name: customInterest.trim() })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add custom interest',
        variant: 'destructive',
      });
    } else if (data) {
      setInterests(prev => [...prev, data]);
      setSelectedInterests(prev => [...prev, data.id]);
      setCustomInterest('');
    }
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one interest',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in first',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    const userInterests = selectedInterests.map(interestId => ({
      user_id: user.id,
      interest_id: interestId,
    }));

    const { error } = await supabase
      .from('user_interests')
      .insert(userInterests);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save interests',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Interests saved successfully!',
      });
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl shadow-medium">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">What are your interests?</CardTitle>
          <CardDescription className="text-center">
            Select the topics you're passionate about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge
                key={interest.id}
                variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm hover:scale-105 transition-transform"
                onClick={() => toggleInterest(interest.id)}
              >
                {selectedInterests.includes(interest.id) && (
                  <Check className="w-3 h-3 mr-1" />
                )}
                {interest.name}
              </Badge>
            ))}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="custom">Add your own interest</Label>
            <div className="flex gap-2">
              <Input
                id="custom"
                placeholder="e.g., Astronomy, Gardening..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
              />
              <Button onClick={addCustomInterest} variant="outline">
                Add
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={loading || selectedInterests.length === 0}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Interests;