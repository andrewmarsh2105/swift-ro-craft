import { Link } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, Flag, WifiOff, ArrowRight, UserPlus, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: ClipboardList,
    title: 'Track Every RO',
    description: 'Log repair orders with line items, hours, and labor types — all from your phone.',
  },
  {
    icon: BarChart3,
    title: 'Pay Period Summaries',
    description: 'See your total hours and earnings by pay period at a glance.',
  },
  {
    icon: Flag,
    title: 'Flag Discrepancies',
    description: 'Mark questionable charges and track unresolved issues in your flag inbox.',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    description: 'No signal in the shop? No problem. Your data syncs when you\'re back online.',
  },
];

const steps = [
  { icon: UserPlus, label: 'Sign Up', detail: 'Create your free account in seconds.' },
  { icon: FileText, label: 'Log Your ROs', detail: 'Add repair orders, lines, and hours as you work.' },
  { icon: CheckCircle, label: 'Review Your Pay', detail: 'Check summaries, spot errors, and get paid right.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg">RO Navigator</span>
          </div>
          <Link to="/auth">
            <Button size="sm" className="cursor-pointer">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Track Your Hours.{' '}
            <span className="text-primary">Get Paid Right.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The free tool built for auto techs to log repair orders, review pay periods, and make sure every hour counts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/auth">
              <Button size="lg" className="cursor-pointer gap-2 w-full sm:w-auto">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Everything you need to stay on top of your pay
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-xl p-6 shadow-card space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.label} className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto relative">
                  <s.icon className="h-6 w-6 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{s.label}</h3>
                <p className="text-sm text-muted-foreground">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to take control of your pay?</h2>
          <p className="text-muted-foreground">
            Join techs who use RO Navigator to make sure they get paid for every hour they work.
          </p>
          <Link to="/auth">
            <Button size="lg" className="cursor-pointer gap-2">
              Create Your Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4">
        <p className="text-center text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
        </p>
      </footer>
    </div>
  );
}
