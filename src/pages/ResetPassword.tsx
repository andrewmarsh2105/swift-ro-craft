import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { BrandMarkContainer } from '@/components/brand';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

// How long to wait for PASSWORD_RECOVERY event before showing an error.
const RECOVERY_TIMEOUT_MS = 6_000;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const resolved = useRef(false);

  // Supabase fires PASSWORD_RECOVERY once it validates the token in the URL hash.
  // We wait for that event before showing the form so we know the session is active.
  // If the event never fires (expired/invalid link, or direct navigation), show an
  // error after RECOVERY_TIMEOUT_MS instead of spinning forever.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!resolved.current) {
        resolved.current = true;
        setTimedOut(true);
      }
    }, RECOVERY_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeoutId);
        resolved.current = true;
        setReady(true);
      }
    });
    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated — you are now signed in');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <BrandMarkContainer size={56} className="mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Link expired or invalid</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link has expired or has already been used.
              Request a new one from the sign-in page.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-5 h-10 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 30%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative w-full max-w-sm space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="text-center space-y-3">
          <div className="mx-auto">
            <BrandMarkContainer size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Set New Password</h1>
            <p className="text-muted-foreground text-sm mt-1">Pick something you'll remember.</p>
          </div>
        </div>

        <Card className="shadow-raised rounded-2xl border-border/50">
          <CardContent className="pt-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} RO Navigator
        </p>
      </motion.div>
    </div>
  );
}
