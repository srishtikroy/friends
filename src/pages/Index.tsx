import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center">
        <div className="animate-pulse">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            SocialNet
          </h1>
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
