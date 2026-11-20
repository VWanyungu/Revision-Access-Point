import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth, AdminRole } from '@/contexts/AuthContext';
import { supabase } from '@/data/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo-light.svg';

const points = [
  { title: 'Upload and organise resources', body: 'Papers, notes and links for every unit, in one list.' },
  { title: 'See your share', body: 'Paid passes and earnings for the courses you manage.' },
  { title: 'Add admins', body: 'Give people access to a school or a single course.' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role] = useState<AdminRole>('super_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  // Already signed in: skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/dashboard', { replace: true }); });
  }, [navigate]);

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
    <div className="flex min-h-screen bg-surface lg:flex-row">
      <aside className="hidden shrink-0 flex-col justify-between bg-band px-10 pb-12 pt-10 dark:bg-field lg:flex lg:w-[38%] lg:max-w-[540px] xl:px-14">
        <img src={logo} alt="" className="h-7 w-fit invert" />
        <div className="flex flex-col gap-6">
          <p className="text-2xl text-band-fg">Everything students study, managed in one place.</p>
          <div>
            {points.map((p) => (
              <div key={p.title} className="flex flex-col gap-1 border-t border-band-raised py-4 dark:border-line">
                <p className="text-base font-medium text-band-fg">{p.title}</p>
                <p className="text-sm text-band-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-band-muted">Revision Access Point admin</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="px-5 pb-2 pt-5 lg:hidden">
          <img src={logo} alt="Revision Access Point admin" className="h-7 dark:invert" />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-8 pt-7 lg:p-0">
          <form onSubmit={handleSubmit} className="flex w-full max-w-[420px] flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold">Sign in</h1>
              <p className="text-base text-ink-muted">Use the email your admin account was created with.</p>
            </div>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-0 flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p id="login-error" role="alert" className="text-sm text-danger">{error}</p>
            )}

            <Button type="submit" className="h-11 w-full action-button" disabled={isLoading} aria-busy={isLoading}>
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
      </main>
    </div>
  );
};

export default Login;
