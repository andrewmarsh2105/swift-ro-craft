import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle, Loader2, ShieldCheck, Clock3, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PublicPageFooter, PublicPageHeader } from '@/components/public/PublicPageChrome';

export default function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitInFlightRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitInFlightRef.current) return;

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (name.length > 100 || email.length > 255 || message.length > 2000) {
      toast.error('One or more fields exceed the maximum length');
      return;
    }

    submitInFlightRef.current = true;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('support_requests').insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        user_id: user?.id || null,
      });

      if (error) throw error;

      supabase.functions.invoke('send-support-email', {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      }).catch(console.error);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message. Please try again.');
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicPageHeader showBack backLabel="Back" />

      <main className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[1100px]">
          {submitted ? (
            <div className="mx-auto max-w-[620px] rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center shadow-[0_12px_36px_-24px_rgba(8,62,167,0.45)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight">Message Sent</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                Thanks for contacting RO Navigator support. We usually respond within 24 hours.
              </p>
              <Link to="/" className="inline-flex">
                <Button variant="outline" className="mt-6">Back to Home</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.08fr] lg:gap-8">
              <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#081C45] via-[#083EA7] to-[#0B5FFF] p-6 text-blue-50 md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/90">Support</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">We can help fast.</h1>
                <p className="mt-4 text-sm leading-relaxed text-blue-100/95 md:text-[15px]">
                  Trial questions, lifetime access issues, account sign-in problems, and workflow questions are all handled here.
                </p>

                <div className="mt-6 space-y-3 rounded-xl border border-white/25 bg-white/10 p-4">
                  <div className="flex items-start gap-2.5">
                    <Clock3 className="mt-0.5 h-4 w-4 text-blue-100" />
                    <p className="text-sm">Typical response time: within 24 hours.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-blue-100" />
                    <p className="text-sm">Your request is linked to your account when you are signed in.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex items-center gap-1 text-blue-100"><Smartphone className="h-3.5 w-3.5" /><Monitor className="h-3.5 w-3.5" /></div>
                    <p className="text-sm">Support covers mobile + desktop workflows.</p>
                  </div>
                </div>

                <p className="mt-5 text-xs text-blue-100/85">
                  Pricing reminder: 14-day free trial, then one-time $15.99 for lifetime access. No recurring subscription.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_12px_36px_-24px_rgba(8,62,167,0.35)]">
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Contact support</h2>
                <p className="mt-2 text-sm text-slate-600">Share as much detail as you can. We\'ll reply to your email.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                      rows={6}
                    />
                    <p className="text-right text-xs text-slate-500">{message.length}/2000</p>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full">
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Send Message</>
                    )}
                  </Button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>

      <PublicPageFooter />
    </div>
  );
}
