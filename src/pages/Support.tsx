import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (name.length > 100 || email.length > 255 || message.length > 2000) {
      toast.error('One or more fields exceed the maximum length');
      return;
    }

    setLoading(true);
    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('support_requests').insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        user_id: user?.id || null,
      });

      if (error) throw error;

      // Fire-and-forget email notification
      supabase.functions.invoke('send-support-email', {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      }).catch(console.error);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-[1100px] mx-auto px-4">
          <Link to="/">
            <Logo variant="full" scheme="auto" size="md" className="text-foreground" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 py-20 space-y-10">
        {submitted ? (
          <div className="text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Message Sent</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Thanks for reaching out. We'll get back to you within 24 hours.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-4">Back to Home</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-center">
              <h1 className="text-3xl font-bold tracking-tight">Contact Support</h1>
              <p className="text-muted-foreground">
                Have a question, issue, or feedback? Send us a message and we'll respond within 24 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  maxLength={100}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  maxLength={255}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question or issue..."
                  required
                  maxLength={2000}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send Message</>
                )}
              </Button>
            </form>

            <div className="text-center space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">Pro subscribers receive priority support.</p>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
          </p>
          <nav className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Terms</Link>
            <Link to="/support" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
