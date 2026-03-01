import { Link } from 'react-router-dom';
import { Wrench, ArrowRight, ClipboardCheck, Flag, BarChart3, WifiOff, Camera, FileSpreadsheet, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const steps = [
  { num: '1', title: 'Sign Up Free', desc: 'Create your account in seconds — no credit card needed.' },
  { num: '2', title: 'Log Your ROs', desc: 'Add repair orders, line items, and hours as you work.' },
  { num: '3', title: 'Review & Get Paid', desc: 'Check summaries, catch errors, close out your pay period.' },
];

const outcomes = [
  {
    icon: ClipboardCheck,
    title: 'Close Out Pay Periods',
    desc: 'Freeze your hours at the end of each period. Know exactly what you earned before the check arrives.',
  },
  {
    icon: Flag,
    title: 'Flag & Resolve Issues',
    desc: 'Mark questionable charges, missing hours, or advisor questions. Track every one until it\'s resolved.',
  },
  {
    icon: BarChart3,
    title: 'Compare Periods',
    desc: 'See how this week stacks up against last week. Spot trends in your hours and earnings over time.',
  },
];

const freeFeatures = [
  'Up to 150 ROs/month',
  'Pay period summaries',
  'Flag inbox',
  'Offline mode',
  'Dark mode',
];

const proFeatures = [
  'Unlimited ROs',
  'Scan ROs with your phone (OCR)',
  'Multi-period comparison reports',
  'Full spreadsheet view & exports',
  'Priority support',
];

const faqs = [
  { q: 'Is RO Navigator really free?', a: 'Yes. The free plan gives you up to 150 ROs per month with pay period summaries, flags, and offline mode. No credit card required.' },
  { q: 'What does Pro add?', a: 'Pro unlocks unlimited ROs, phone scanning (OCR), multi-period comparisons, full spreadsheet exports (CSV/XLSX), and priority support. It\'s $8.99/mo or $79.99/yr with a 7-day free trial.' },
  { q: 'Can I use it offline in the shop?', a: 'Yes. You can log ROs and lines without an internet connection. Everything syncs automatically when you\'re back online.' },
  { q: 'How do I cancel Pro?', a: 'Go to Settings → Manage Subscription to open your billing portal. You can cancel anytime — no questions asked.' },
  { q: 'Is my data safe?', a: 'Your data is encrypted and protected with row-level security. Only you can see your repair orders.' },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="h-[18px] w-[18px] text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">RO Navigator</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline transition-colors">Pricing</a>
            <Link to="/auth">
              <Button size="sm" className="cursor-pointer">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-[72px] md:py-24 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
                Track Your Hours.{' '}
                <span className="text-primary">Get Paid Right.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                The free tool built for auto techs to log repair orders, review pay periods, and make sure every hour counts.
              </p>
              <Link to="/auth">
                <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex flex-col gap-2 pt-2">
                {[
                  'Log RO lines in seconds',
                  'Close out a period for payroll',
                  'Works offline in the shop',
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50 pt-1">
                Built for dealership and independent shop techs
              </p>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <img
                src={heroMockup}
                alt="RO Navigator app showing repair order tracking on a mobile phone"
                className="w-full max-w-lg mx-auto rounded-2xl shadow-raised"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-[72px] md:py-24 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            How It Works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-border" />
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="text-center space-y-4 relative"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto relative z-10">
                  <span className="text-primary font-bold text-xl">{s.num}</span>
                </div>
                <h3 className="font-semibold text-lg tracking-tight">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Outcomes */}
      <section className="py-[72px] md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Stay on top of every dollar you earn
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {outcomes.map((o, i) => (
              <motion.div
                key={o.title}
                className="bg-card rounded-2xl p-7 shadow-card space-y-4 border border-border/50"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <o.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg tracking-tight">{o.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-[72px] md:py-24 px-4 bg-muted/40">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-5"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                See every RO in one place
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Pro unlocks a full spreadsheet view with sorting, filtering, and export. Track warranty, customer-pay, and internal hours side by side.
              </p>
              <div className="space-y-2">
                {['Sort & filter by date, advisor, or labor type', 'Export to CSV, XLSX, or PDF', 'Compare multiple pay periods'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <img
                src={spreadsheetPreview}
                alt="RO Navigator spreadsheet view showing repair orders and hours"
                className="rounded-2xl shadow-raised border border-border/50 w-full"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section id="pricing" className="py-[72px] md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[800px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <motion.div
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50 space-y-5"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <div>
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-3">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full h-11 cursor-pointer">Get Started</Button>
              </Link>
            </motion.div>

            <motion.div
              className="bg-card rounded-2xl p-8 shadow-card ring-2 ring-primary space-y-5 relative"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={2}
            >
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <div>
                <h3 className="font-semibold text-lg">Pro</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$8.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">or $79.99/yr (save 26%)</p>
              </div>
              <ul className="space-y-3">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full h-11 cursor-pointer">Start 7-Day Free Trial</Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-[72px] md:py-24 px-4 bg-muted/40">
        <div className="max-w-[700px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="bg-card rounded-xl border border-border/50 overflow-hidden"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-20px' }} variants={fadeUp} custom={i + 1}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[72px] md:py-24 px-4">
        <motion.div
          className="max-w-[600px] mx-auto text-center space-y-6"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ready to take control of your pay?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Join techs who use RO Navigator to make sure they get paid for every hour they work.
          </p>
          <Link to="/auth">
            <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12 mt-2">
              Create Your Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
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
