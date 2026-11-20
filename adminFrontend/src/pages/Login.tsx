import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AdminRole } from '@/contexts/AuthContext';
// import { useAuth } from '@/hooks/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logo from '@/assets/logo-light.svg';
import { GraduationCap, Loader, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, role);

      navigate('/dashboard');
    } catch (err) {
      // Say what actually failed: a wrong password and a dead network need different next steps.
      const offline = !navigator.onLine || /fetch|network/i.test(`${(err as Error)?.name} ${(err as Error)?.message}`);
      setError(offline ? 'Could not reach the server. Check your connection and try again.' : 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            {/* <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div> */}
            <img src={logo} alt="Revision Access Point admin" className="h-7 dark:invert" />
          </div>

          {/* <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold">Revision Access Point Login</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to access the admin panel
            </p>
          </div> */}

          <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl bg-surface p-8 ring-1 ring-line">
            <h1 className="sr-only">Admin sign in</h1>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@university.edu"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!error}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                className="h-11"
              />
            </div>

            {error && (
              <p id="login-error" role="alert" className="text-sm text-danger text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 action-button"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
