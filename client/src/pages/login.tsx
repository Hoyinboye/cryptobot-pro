import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Bot, CheckCircle, Loader2 } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';

export default function Login() {
  const { signIn, signInAnonymously, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Bot className="text-primary text-4xl mr-2 w-10 h-10" />
            <div>
              <CardTitle className="text-2xl">CryptoBot Pro</CardTitle>
              <CardDescription className="text-muted-foreground">
                AI-Powered Trading Platform
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Welcome to the Future of Trading</h2>
            <p className="text-sm text-muted-foreground">
              Experience AI-driven cryptocurrency trading with advanced risk management and real-time analytics.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>AI-powered trading signals</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Real-time market analysis</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Advanced risk management</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Demo & live trading modes</span>
            </div>
          </div>

          <Button
            onClick={signIn}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
            data-testid="google-sign-in"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={signInAnonymously}
            disabled={loading}
            variant="outline"
            className="w-full"
            size="lg"
            data-testid="anonymous-sign-in"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bot className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Signing in...' : 'Try Demo Mode'}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              <br />
              Start with demo mode to explore risk-free trading.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
