import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Flag, BarChart3, Check, ChevronDown, ChevronUp, Infinity, Camera, FileSpreadsheet, Shield } from 'lucide-react';
import roLogo from '@/assets/ro-logo.jpeg';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.png';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const steps = [
  { num: '1', title: 'Sign Up Free', desc: 'Create your account in seconds — no credit card, no commitment.' },
  { num: '2', title: 'Log Your ROs', desc: 'Add repair orders, line items, and hours as you work throughout the day.' },
  { num: '3', title: 'Review & Get Paid', desc: 'Verify totals, catch missing hours, and close out your pay period with confidence.' },
];

const outcomes = [
  {
    icon: ClipboardCheck,
    title: 'Close Out Pay Periods',
    desc: 'Freeze your hours at the end of each period. Know exactly what you earned before the check arrives — no more surprises.',
  },
  {
    icon: Flag,
    title: 'Flag & Resolve Issues',
    desc: 'Mark questionable charges, missing hours, or advisor disputes. Track every flag until it\'s resolved.',
  },
  {
    icon: BarChart3,
    title: 'Compare Pay Periods',
    desc: 'See how this week stacks up against last. Spot trends in your hours and catch patterns early.',
  },
];

const freeFeatures = [
  'Up to 150 ROs/month',
  'Pay period summaries',
  'Flag inbox & resolution',
  'Offline mode',
  'Preset quick-add buttons',
];

const proFeatures = [
  'Everything in Free',
  'Unlimited ROs — no cap',
  'Scan ROs with your phone (OCR)',
  'Multi-period reports & exports',
  'Payroll CSV, XLSX, and PDF',
  'Pay period closeouts',
];

const faqs = [
  {
    q: 'Is RO Navigator really free?',
    a: 'Yes. The free plan includes pay period summaries, flag inbox, offline mode, and quick-add presets — no credit card required. A monthly RO limit of 150 applies. Most techs stay under that.',
  },
  {
    q: 'Who is RO Navigator built for?',
    a: 'Automotive technicians at dealerships and independent shops who get paid hourly or flat-rate and want to track their repair orders, verify their pay, and close out pay periods without guessing.',
  },
  {
    q: 'What does Pro add?',
    a: 'Pro removes the RO cap entirely and adds phone scanning (snap a photo → auto-fill lines), multi-period comparisons, full spreadsheet exports (CSV/XLSX/PDF), and payroll-ready closeouts. It\'s $8.99/mo or $79.99/yr — both include a 7-day free trial.',
  },
  {
    q: 'How does the 7-day free trial work?',
    a: 'You get full Pro access for 7 days at no charge. You won\'t be billed until the trial ends. Cancel anytime from Settings → Manage Subscription before the trial is up and you pay nothing.',
  },
  {
    q: 'Can I use it offline in the shop?',
    a: 'Yes. You can log ROs and line items without a signal. Everything syncs automatically when you\'re back online — no lost data.',
  },
  {
    q: 'How do I cancel Pro?',
    a: 'Go to Settings → Manage Subscription to open your billing portal. Cancel anytime, no questions asked. You keep Pro access until the end of your billing period.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Yes. Your repair order data is encrypted in transit and at rest. Row-level security means only your account can ever access your ROs.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <img src={roLogo} alt="RO Navigator" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg tracking-tight">RO Navigator</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">FAQ</a>
            <Link to="/auth">
              <Button size="sm" variant="outline" className="cursor-pointer hidden sm:flex">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="cursor-pointer">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-10 md:py-16 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.07) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-10 items-center">
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                Track Your Hours.{' '}
                <span className="text-primary">Get Paid Right.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Log RO lines fast, close out your pay period, and catch missing hours before payroll. Built for techs who know every hour matters.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12">
                    Start for Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="#pricing"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  See pricing ↓
                </a>
              </div>
              {/* Trust strip */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-x-5 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> Free to start — no credit card</span>
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> Works offline in the shop</span>
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> Mobile + desktop</span>
              </div>
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
                className="w-full mx-auto rounded-xl border border-border/60 shadow-raised"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-10 md:py-14 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Up and running in minutes
          </motion.h2>
          <div className="grid grid-cols-3 gap-3 md:gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-border" />
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="bg-card rounded-xl md:rounded-2xl p-4 md:p-0 md:bg-transparent shadow-card md:shadow-none border border-border/50 md:border-0 text-center space-y-2 md:space-y-4 relative"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mx-auto relative z-10">
                  <span className="text-primary font-bold text-base md:text-xl">{s.num}</span>
                </div>
                <h3 className="font-semibold text-sm md:text-lg tracking-tight">{s.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto hidden md:block">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Outcomes */}
      <section className="py-14 md:py-20 px-4 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Never leave money on the table
          </motion.h2>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-10 items-center">
            <div className="space-y-3 md:space-y-4">
              {outcomes.map((o, i) => (
                <motion.div
                  key={o.title}
                  className="bg-card rounded-xl p-4 md:p-5 shadow-card border border-border/50 flex items-start gap-4"
                  initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <o.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm md:text-base tracking-tight">{o.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{o.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={2}
            >
              <img
                src={multiperiodPreview}
                alt="RO Navigator closeout and compare periods view"
                className="w-full rounded-xl border border-border/60 shadow-raised"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-14 md:py-24 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto space-y-16 md:space-y-20">
          <div className="space-y-4 md:space-y-6">
            <motion.div
              className="max-w-2xl"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Every RO, one place
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-2">
                Pro unlocks a full spreadsheet view with sorting, filtering, and export. Track warranty, customer-pay, and internal hours side by side — then export it for payroll or a dispute.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs md:text-sm text-muted-foreground">
                {['Sort & filter by date, advisor, or type', 'Export to CSV, XLSX, or PDF', 'Compare multiple pay periods side by side'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <img
                src={spreadsheetPreview}
                alt="RO Navigator Pro spreadsheet view with RO data and hours columns"
                className="rounded-xl border border-border/60 shadow-raised w-full"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section id="pricing" className="py-14 md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[820px] mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-14 space-y-2"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="text-sm text-muted-foreground">Start free. Upgrade when you need more.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {/* Free */}
            <motion.div
              className="bg-card rounded-xl md:rounded-2xl p-6 md:p-8 shadow-card border border-border/50 space-y-5 flex flex-col"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <div>
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">No credit card, no expiration.</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full h-11 cursor-pointer">Get Started Free</Button>
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div
              className="bg-card rounded-xl md:rounded-2xl p-6 md:p-8 shadow-card ring-2 ring-primary space-y-5 relative flex flex-col"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={2}
            >
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <div>
                <h3 className="font-semibold text-lg">Pro</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$8.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">or $79.99/yr — saves you $27.89</p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                  <Check className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold text-primary">7-day free trial — try risk-free</span>
                </div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className={f === 'Everything in Free' ? 'text-muted-foreground' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full h-11 cursor-pointer font-semibold">Start 7-Day Free Trial</Button>
              </Link>
              <p className="text-[11px] text-center text-muted-foreground -mt-2">
                No charge until trial ends. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pro feature callouts */}
      <section className="py-10 md:py-16 px-4 bg-muted/40">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="text-xl md:text-2xl font-bold text-center mb-8 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            What Pro unlocks
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Infinity, title: 'Unlimited ROs', desc: 'Log as many repair orders as you need. No monthly cap.' },
              { icon: Camera, title: 'RO Photo Scan', desc: 'Snap a photo of a repair order — lines auto-fill via OCR.' },
              { icon: BarChart3, title: 'Period Closeouts', desc: 'Freeze and compare pay periods side by side.' },
              { icon: FileSpreadsheet, title: 'Full Exports', desc: 'Download payroll CSV, audit XLSX, or PDF for any date range.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="bg-card rounded-xl p-5 shadow-card border border-border/50 space-y-2.5"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm tracking-tight">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[700px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-10 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden divide-y divide-border/40">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-20px' }} variants={fadeUp} custom={i + 1}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 md:px-6 py-4 md:py-5 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="font-semibold text-sm md:text-base pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 md:px-6 pb-4 md:pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 md:py-24 px-4 bg-muted/40">
        <motion.div
          className="max-w-[600px] mx-auto text-center space-y-5"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Stop guessing. Start knowing.</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            Every hour you don't track is an hour you might not get paid for. RO Navigator gives you the record to back it up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/auth">
              <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12">
                Create Your Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="cursor-pointer gap-2 text-base px-8 h-12">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/60">No credit card required to start.</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 md:py-8 px-4">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
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
