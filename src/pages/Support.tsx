import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft, Mail, Clock, MessageSquare } from 'lucide-react';

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-5xl mx-auto px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="h-[18px] w-[18px] text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">RO Navigator</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Need help with RO Navigator? We're here for you. Reach out and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-7 shadow-card space-y-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-lg tracking-tight">Email Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send us an email and we'll respond within 24 hours on business days.
            </p>
            <a
              href="mailto:ronavigator@outlook.com"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
            >
              <Mail className="h-4 w-4" />
              ronavigator@outlook.com
            </a>
          </div>

          <div className="bg-card rounded-2xl p-7 shadow-card space-y-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-lg tracking-tight">Response Time</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We aim to respond within 24 hours. Pro subscribers receive priority support.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: 'How do I reset my password?',
                a: 'On the sign-in page, enter your email and tap "Forgot Password?" to receive a reset link.',
              },
              {
                q: 'How do I cancel my Pro subscription?',
                a: 'Go to Settings → Manage Subscription to open the billing portal, where you can cancel anytime.',
              },
              {
                q: 'Is my data safe?',
                a: 'Yes. Your data is encrypted and secured with row-level access controls. Only you can see your repair orders.',
              },
              {
                q: 'What happens when I hit the 150 RO limit?',
                a: 'Free accounts are limited to 150 ROs per calendar month. You can upgrade to Pro for unlimited ROs or wait until the next month.',
              },
              {
                q: 'Can I export my data?',
                a: 'Pro subscribers can export data as CSV, XLSX, or PDF. Free users can view summaries in-app.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-card rounded-xl p-5 shadow-card space-y-2">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <p className="text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
        </p>
      </footer>
    </div>
  );
}
