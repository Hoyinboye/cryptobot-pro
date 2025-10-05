import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function TopNavigation() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleModeToggle = async () => {
    if (!user) return;
    
    setIsSwitchingMode(true);
    try {
      const token = localStorage.getItem('firebase-token');
      const response = await fetch('/api/settings/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isDemo: !user.isDemo
        })
      });

      if (response.ok) {
        toast({
          title: `Switched to ${user.isDemo ? 'Live' : 'Demo'} Mode`,
          description: user.isDemo 
            ? 'You are now trading with real funds. Trade carefully!' 
            : 'You are now in demo mode with virtual funds.',
        });
        // Refresh the page to update the user state
        window.location.reload();
      } else {
        throw new Error('Failed to switch mode');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch trading mode. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSwitchingMode(false);
    }
  };

  return (
    <nav className="bg-card border-b border-border px-4 py-3" data-testid="top-navigation">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-robot text-primary text-2xl"></i>
            <h1 className="text-xl font-bold text-foreground">CryptoBot Pro</h1>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Badge variant="secondary" className="bg-success/20 text-success">
              {user?.isDemo ? 'DEMO MODE' : 'LIVE MODE'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleModeToggle}
              disabled={isSwitchingMode}
              data-testid="mode-toggle"
            >
              {isSwitchingMode ? 'Switching...' : `Switch to ${user?.isDemo ? 'Live' : 'Demo'}`}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Market Status */}
          <div className="hidden lg:flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow"></div>
              <span className="text-muted-foreground">Market:</span>
              <span className="text-success font-medium">Open</span>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <Button variant="ghost" size="sm" data-testid="notifications">
              <i className="far fa-bell text-muted-foreground"></i>
            </Button>

            <Button variant="ghost" size="sm" data-testid="settings">
              <i className="fas fa-cog text-muted-foreground"></i>
            </Button>

            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium">{user?.displayName || 'User'}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              data-testid="sign-out"
            >
              <i className="fas fa-sign-out-alt text-muted-foreground"></i>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}