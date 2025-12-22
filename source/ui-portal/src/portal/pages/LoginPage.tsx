import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { Card, CardContent, CardHeader, CardTitle } from '@/portal/ui/Card';
import { Button } from '@/portal/ui/Button';
import { Input } from '@/portal/ui/Input';
import { Label } from '@/portal/ui/Label';
import { Alert } from '@/portal/ui/Alert';
import { ThemeToggle } from '@/portal/theme/ThemeToggle';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.length > 0, [username, password]);
  const canSubmitNewPassword = useMemo(() => {
    return newPassword.length > 0 && newPassword === confirmNewPassword;
  }, [newPassword, confirmNewPassword]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res: any = await Auth.signIn(username.trim(), password);
      if (res?.challengeName === 'NEW_PASSWORD_REQUIRED') {
        // Invited users often need to set a permanent password on first login.
        setPendingUser(res);
        setNewPassword('');
        setConfirmNewPassword('');
        return;
      }
      // App component checks currentAuthenticatedUser; simplest is a hard navigate.
      navigate('/app/agents', { replace: true });
      window.location.reload();
    } catch (err: any) {
      const msg =
        err?.message ||
        (typeof err === 'string' ? err : 'Unable to sign in. Please check your credentials and try again.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCompleteNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pendingUser) return;
    if (!canSubmitNewPassword) {
      setError('Passwords must match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await Auth.completeNewPassword(pendingUser, newPassword);
      navigate('/app/agents', { replace: true });
      window.location.reload();
    } catch (err: any) {
      const msg =
        err?.message ||
        (typeof err === 'string' ? err : 'Unable to set a new password. Please try again.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg border border-border bg-muted" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide text-foreground">
                  AiAgentsWorkforce
                </div>
                <div className="text-xs text-muted-foreground">Customer Portal</div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{pendingUser ? 'Set a new password' : 'Sign in'}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {pendingUser
                  ? 'Your account needs a permanent password before you can continue.'
                  : 'Access your agents, channels, and usage.'}
              </p>
            </CardHeader>
            <CardContent>
              {error && <Alert variant="error">{error}</Alert>}

              {!pendingUser ? (
                <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="username">Email or username</Label>
                    <Input
                      id="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="you@company.com"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button className="w-full" type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              ) : (
                <form className="mt-4 space-y-4" onSubmit={onCompleteNewPassword}>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create a strong password"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                    <Input
                      id="confirmNewPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? 'Hide passwords' : 'Show passwords'}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => {
                        setPendingUser(null);
                        setPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setError(null);
                      }}
                    >
                      Back to sign in
                    </button>
                  </div>

                  <Button className="w-full" type="submit" disabled={!canSubmitNewPassword || isSubmitting}>
                    {isSubmitting ? 'Saving…' : 'Set new password'}
                  </Button>
                </form>
              )}

              <div className="mt-6 border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">If your tenant uses SSO/Hosted UI:</div>
                <Button
                  className="mt-2 w-full"
                  variant="secondary"
                  onClick={() => Auth.federatedSignIn()}
                  disabled={isSubmitting}
                >
                  Sign in with browser
                </Button>
                <div className="mt-3 text-xs text-muted-foreground">
                  Trouble signing in? Contact your admin to reset your password.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
