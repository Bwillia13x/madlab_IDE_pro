'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Lock, 
  LogIn, 
  Building2, 
  Chrome, 
  Shield,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { analytics } from '@/lib/analytics';

interface LoginFormProps {
  onSuccess?: () => void;
  allowGuest?: boolean;
  ssoProviders?: Array<{
    name: string;
    displayName: string;
    icon?: React.ReactNode;
    loginUrl: string;
  }>;
}

export function LoginForm({ onSuccess, allowGuest = false, ssoProviders = [] }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const defaultSsoProviders = [
    {
      name: 'google',
      displayName: 'Google Workspace',
      icon: <Chrome className="h-4 w-4" />,
      loginUrl: '/auth/sso/google',
    },
    {
      name: 'microsoft',
      displayName: 'Microsoft Azure AD',
      icon: <Building2 className="h-4 w-4" />,
      loginUrl: '/auth/sso/microsoft',
    },
    {
      name: 'okta',
      displayName: 'Okta',
      icon: <Shield className="h-4 w-4" />,
      loginUrl: '/auth/sso/okta',
    },
  ];

  const availableSsoProviders = ssoProviders.length > 0 ? ssoProviders : defaultSsoProviders;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await login(formData.email, formData.password);
      
      toast.success(`Welcome back, ${user.name}!`);
      
      analytics.track('successful_login', {
        user_id: user.id,
        login_method: 'email_password',
        user_role: user.role,
        has_organization: !!user.organization,
      }, 'auth');
      
      onSuccess?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      
      analytics.track('login_error', {
        error: errorMessage,
        // avoid PII: do not send plaintext email
        login_method: 'email_password',
      }, 'auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSsoLogin = (provider: string, loginUrl: string) => {
    analytics.track('sso_login_attempted', {
      provider,
      login_method: 'sso',
    }, 'auth');
    
    // In a real implementation, this would redirect to SSO provider
    window.location.href = loginUrl;
  };

  const handleGuestAccess = () => {
    analytics.track('guest_access', {
      login_method: 'guest',
    }, 'auth');
    
    toast.info('Continuing as guest with limited features');
    onSuccess?.();
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@company.com',
      password: 'demo123',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">ML</span>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Welcome to MAD LAB
          </CardTitle>
          <CardDescription>
            Sign in to your financial workbench
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* SSO Providers */}
          {availableSsoProviders.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-center text-muted-foreground">
                Enterprise Single Sign-On
              </div>
              
              <div className="grid gap-2">
                {availableSsoProviders.map((provider) => (
                  <Button
                    key={provider.name}
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSsoLogin(provider.name, provider.loginUrl)}
                    disabled={isLoading}
                  aria-label={`Continue with ${provider.displayName}`}>
                    {provider.icon}
                    <span className="ml-2">Continue with {provider.displayName}</span>
                  </Button>
                ))}
              </div>

              <Separator className="my-4" />
              
              <div className="text-sm text-center text-muted-foreground">
                Or sign in with email
              </div>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  disabled={isLoading}
                  required
                  autoComplete="email"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            {error && (
              <div id="login-error" role="alert" className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Demo Account */}
          <div className="space-y-3">
            <Separator />
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Want to try it out?
              </p>
              
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                >
                  Demo Account
                </Button>
                
                {allowGuest && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGuestAccess}
                    disabled={isLoading}
                  >
                    Guest Access
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="pt-4 border-t">
            <div className="text-xs text-center text-muted-foreground mb-2">
              Trusted by financial professionals
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              <Badge variant="secondary" className="text-xs">
                Real-time Data
              </Badge>
              <Badge variant="secondary" className="text-xs">
                AI-Powered
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Enterprise Security
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;