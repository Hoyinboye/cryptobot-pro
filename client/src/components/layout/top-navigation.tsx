import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function TopNavigation() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
              data-testid="mode-toggle"
            >
              Switch to {user?.isDemo ? 'Live' : 'Demo'}
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
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-muted-foreground`}></i>
            </Button>
            
            <Button variant="ghost" size="sm" className="relative" data-testid="notifications">
              <i className="fas fa-bell text-muted-foreground"></i>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs"></span>
            </Button>
            
            <div className="flex items-center space-x-2 pl-3 border-l border-border">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium" data-testid="user-name">
                  {user?.displayName || 'User'}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="user-email">
                  {user?.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                data-testid="sign-out"
                className="ml-2"
              >
                <i className="fas fa-sign-out-alt text-muted-foreground"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
