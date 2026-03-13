import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackSignupCompleted } from '@/lib/analytics';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, Check, Shield, Wifi } from 'lucide-react';
import { Logo, BrandMarkContainer } from '@/components/brand';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

const brandFeatures = [
  'Log ROs and line items in seconds',
  'Catch missing hours before payroll',
  'Close out pay periods with confidence',
];

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in');
        navigate('/');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          trackSignupCompleted(data.user.id);
          supabase.functions.invoke('send-welcome-email', {
            body: { email },
          }).catch(() => { /* non-fatal */ });
        }
        toast.success('Check your email to confirm your account');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.info('Enter your email above first');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset email sent — check your inbox');
    } catch (err: any) {
      toast.error(err.message || 'Could not send reset email');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — desktop only */}
      <div className="hidden md:flex flex-col w-[42%] max-w-[460px] flex-shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)' }}
      >
        {/* Subtle noise/texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Decorative circle */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col h-full p-10">
          {/* Logo */}
          <Logo variant="full" scheme="dark" size="md" />

          {/* Middle content */}
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
                Track Your Hours.<br />Get Paid Right.
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Built for flat-rate technicians who know every hour matters.
              </p>
            </div>

            <ul className="space-y-3">
              {brandFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm text-white/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom */}
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Background decorations */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 20%, hsl(var(--primary) / 0.07) 0%, transparent 70%)',
          }}
        />

        {/* Back to home */}
        <div className="relative px-6 pt-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            className="w-full max-w-sm space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Mobile-only branding */}
            <div className="flex flex-col items-center gap-2 md:hidden">
              <BrandMarkContainer size={48} />
              <h1 className="text-xl font-bold tracking-tight">RO Navigator</h1>
            </div>

            {/* Desktop heading */}
            <div className="hidden md:block space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Sign in to your account to continue.' : 'Free to start — no credit card needed.'}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="relative flex bg-muted rounded-xl p-1 gap-1">
              {['Sign In', 'Sign Up'].map((label, i) => {
                const active = isLogin === (i === 0);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setIsLogin(i === 0)}
                    className="relative flex-1 py-2 text-sm font-semibold rounded-lg z-10 transition-colors duration-150"
                    style={{ color: active ? undefined : undefined }}
                  >
                    {active && (
                      <motion.div
                        layoutId="auth-tab-pill"
                        className="absolute inset-0 bg-background rounded-lg shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="text-right pt-0.5">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 cursor-pointer font-semibold shadow-sm mt-1"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isLogin ? 'Signing in…' : 'Creating account…'}</>
                ) : (
                  isLogin ? 'Sign In' : 'Create Free Account'
                )}
              </Button>
            </form>

            {/* Mobile toggle link */}
            <p className="text-center text-sm text-muted-foreground md:hidden">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline cursor-pointer"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-1">
              {[
                { icon: Shield, label: 'Encrypted' },
                { icon: Check, label: 'Free to start' },
                { icon: Wifi, label: 'Works offline' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative px-6 pb-5 text-center">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/40">
            <span>© {new Date().getFullYear()} RO Navigator</span>
            <Link to="/privacy" className="hover:text-muted-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
