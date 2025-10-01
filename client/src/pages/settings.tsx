import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { TopNavigation } from '@/components/layout/top-navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { toast } = useToast();

  const { data: userData } = useQuery({
    queryKey: ['/api/user/profile'],
    refetchInterval: 60000,
  });

  const user = (userData as any)?.user;
  const riskSettings = user?.riskSettings || {};

  const [riskEnabled, setRiskEnabled] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState('');
  const [maxDailyLoss, setMaxDailyLoss] = useState('');
  const [maxOpenPositions, setMaxOpenPositions] = useState('');

  // Sync local state with loaded user data
  useEffect(() => {
    if (user?.riskSettings) {
      setRiskEnabled(user.riskSettings.enabled || false);
      setMaxPositionSize(user.riskSettings.maxPositionSize || '');
      setMaxDailyLoss(user.riskSettings.maxDailyLoss || '');
      setMaxOpenPositions(user.riskSettings.maxOpenPositions?.toString() || '');
    }
  }, [user]);

  const updateRiskSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest('PUT', '/api/user/risk-settings', settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Risk Settings Updated',
        description: 'Your risk management settings have been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update risk settings',
        variant: 'destructive',
      });
    }
  });

  const handleSaveRiskSettings = () => {
    updateRiskSettingsMutation.mutate({
      enabled: riskEnabled,
      maxPositionSize: maxPositionSize,
      maxDailyLoss: maxDailyLoss,
      maxOpenPositions: maxOpenPositions,
    });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-bold" data-testid="page-title">Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account, trading preferences, and security settings
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-4" data-testid="settings-tabs">
        <TabsList>
          <TabsTrigger value="account" data-testid="account-tab">Account</TabsTrigger>
          <TabsTrigger value="trading" data-testid="trading-tab">Trading</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="notifications-tab">Notifications</TabsTrigger>
          <TabsTrigger value="security" data-testid="security-tab">Security</TabsTrigger>
          <TabsTrigger value="api" data-testid="api-tab">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4" data-testid="account-content">
          <Card data-testid="profile-card">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  data-testid="email-input"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Email cannot be changed as it's linked to your Google account
                </p>
              </div>

              <div>
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  type="text"
                  value={user?.displayName || ''}
                  placeholder="Enter your display name"
                  data-testid="display-name-input"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="UTC">
                  <SelectTrigger data-testid="timezone-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London Time</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button data-testid="save-profile-btn">
                Save Profile Changes
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="account-type-card">
            <CardHeader>
              <CardTitle>Account Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Demo Account</div>
                  <div className="text-sm text-muted-foreground">
                    Trading with virtual funds for practice
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-orange-600 font-medium">DEMO MODE</div>
                  <Button variant="outline" size="sm" className="mt-2" data-testid="upgrade-account-btn">
                    Upgrade to Live
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4" data-testid="trading-content">
          <Card data-testid="risk-management-card">
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Risk Management</Label>
                  <p className="text-sm text-muted-foreground">
                    Enforce position limits and loss caps on all trades
                  </p>
                </div>
                <Switch 
                  checked={riskEnabled}
                  onCheckedChange={setRiskEnabled}
                  data-testid="risk-enabled-switch"
                />
              </div>

              <div>
                <Label htmlFor="max-position-size">Maximum Position Size (USD)</Label>
                <Input
                  id="max-position-size"
                  type="number"
                  value={maxPositionSize}
                  onChange={(e) => setMaxPositionSize(e.target.value)}
                  placeholder="e.g. 2500"
                  disabled={!riskEnabled}
                  data-testid="input-max-position-size"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum dollar value for a single trade position
                </p>
              </div>

              <div>
                <Label htmlFor="max-daily-loss">Maximum Daily Loss (USD)</Label>
                <Input
                  id="max-daily-loss"
                  type="number"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(e.target.value)}
                  placeholder="e.g. 500"
                  disabled={!riskEnabled}
                  data-testid="input-max-daily-loss"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum total loss allowed per day across all trades
                </p>
              </div>

              <div>
                <Label htmlFor="max-open-positions">Maximum Open Positions</Label>
                <Input
                  id="max-open-positions"
                  type="number"
                  value={maxOpenPositions}
                  onChange={(e) => setMaxOpenPositions(e.target.value)}
                  placeholder="e.g. 10"
                  disabled={!riskEnabled}
                  data-testid="input-max-open-positions"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum number of concurrent open positions
                </p>
              </div>

              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Current Settings:</strong></p>
                  <p>• Risk Management: {riskEnabled ? 'Enabled' : 'Disabled'}</p>
                  {riskEnabled && (
                    <>
                      <p>• Max Position Size: ${maxPositionSize || 'Not set'}</p>
                      <p>• Max Daily Loss: ${maxDailyLoss || 'Not set'}</p>
                      <p>• Max Open Positions: {maxOpenPositions || 'Not set'}</p>
                    </>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSaveRiskSettings}
                disabled={updateRiskSettingsMutation.isPending}
                data-testid="save-risk-settings-btn"
              >
                {updateRiskSettingsMutation.isPending ? 'Saving...' : 'Save Risk Settings'}
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="auto-trading-card">
            <CardHeader>
              <CardTitle>Auto-Trading Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-Trading</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI signals to execute trades automatically
                  </p>
                </div>
                <Switch data-testid="auto-trading-switch" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Smart Order Routing</Label>
                  <p className="text-sm text-muted-foreground">
                    Optimize trade execution across exchanges
                  </p>
                </div>
                <Switch defaultChecked data-testid="smart-routing-switch" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Portfolio Rebalancing</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically rebalance portfolio based on targets
                  </p>
                </div>
                <Switch data-testid="rebalancing-switch" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4" data-testid="notifications-content">
          <Card data-testid="notification-preferences-card">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Trade Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when trades are executed
                  </p>
                </div>
                <Switch defaultChecked data-testid="trade-notifications-switch" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Signal Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for new AI trading signals
                  </p>
                </div>
                <Switch defaultChecked data-testid="signal-alerts-switch" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Price Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when assets reach target prices
                  </p>
                </div>
                <Switch data-testid="price-alerts-switch" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Portfolio Milestones</Label>
                  <p className="text-sm text-muted-foreground">
                    Celebrate portfolio performance milestones
                  </p>
                </div>
                <Switch defaultChecked data-testid="milestones-switch" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4" data-testid="security-content">
          <Card data-testid="security-settings-card">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Session Timeout</Label>
                <Select defaultValue="30m">
                  <SelectTrigger className="mt-1" data-testid="session-timeout-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15 minutes</SelectItem>
                    <SelectItem value="30m">30 minutes</SelectItem>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="4h">4 hours</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" data-testid="setup-2fa-btn">
                  Setup 2FA
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified of new login attempts
                  </p>
                </div>
                <Switch defaultChecked data-testid="login-notifications-switch" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="active-sessions-card">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Current Session</div>
                    <div className="text-sm text-muted-foreground">
                      Chrome on Windows • Active now
                    </div>
                  </div>
                  <div className="text-green-600 text-sm">Current</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4" data-testid="api-content">
          <Card data-testid="api-keys-card">
            <CardHeader>
              <CardTitle>API Keys Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="kraken-api-key">Kraken API Key</Label>
                <Input
                  id="kraken-api-key"
                  type="password"
                  placeholder="Enter your Kraken API key"
                  data-testid="kraken-api-key-input"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Required for live trading functionality
                </p>
              </div>

              <div>
                <Label htmlFor="kraken-secret">Kraken API Secret</Label>
                <Input
                  id="kraken-secret"
                  type="password"
                  placeholder="Enter your Kraken API secret"
                  data-testid="kraken-secret-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sandbox Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use Kraken sandbox for testing
                  </p>
                </div>
                <Switch defaultChecked data-testid="sandbox-mode-switch" />
              </div>

              <Button data-testid="save-api-keys-btn">
                Save API Keys
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="api-status-card">
            <CardHeader>
              <CardTitle>API Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Kraken Exchange</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>OpenAI API</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>WebSocket Feed</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}