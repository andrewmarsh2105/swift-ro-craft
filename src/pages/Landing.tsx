import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Flag, BarChart3, Check, ChevronDown, ChevronUp, Infinity, Camera, FileSpreadsheet, Shield, Wrench } from 'lucide-react';
import { Logo, BrandMarkContainer } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
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
      {/* Accent top line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

      {/* Nav */}
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between h-14 px-4">
          <Logo variant="full" scheme="auto" size="md" className="text-foreground" />
          <div className="flex items-center gap-1">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline px-3 py-1.5 rounded-md hover:bg-muted transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline px-3 py-1.5 rounded-md hover:bg-muted transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline px-3 py-1.5 rounded-md hover:bg-muted transition-colors">FAQ</a>
            <div className="hidden sm:block w-px h-5 bg-border mx-2" />
            <Link to="/auth">
              <Button size="sm" variant="ghost" className="cursor-pointer hidden sm:flex text-muted-foreground hover:text-foreground">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="cursor-pointer font-semibold shadow-sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 md:py-20 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 0%, hsl(var(--primary) / 0.1) 0%, transparent 65%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                <Wrench className="h-3 w-3 text-primary" />
                <span className="text-xs font-semibold text-primary">Built for flat-rate technicians</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                Track Your Hours.{' '}
                <span className="text-primary">Get Paid Right.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Log RO lines fast, close out your pay period, and catch missing hours before payroll. Built for techs who know every hour matters.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12 shadow-md font-semibold">
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
              {/* Glow behind image */}
              <div
                className="absolute -inset-4 rounded-3xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.12) 0%, transparent 70%)' }}
              />
              <img
                src={heroMockup}
                alt="RO Navigator app showing repair order tracking on a mobile phone"
                className="w-full mx-auto rounded-2xl border border-border/60 shadow-raised relative"
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/60 bg-muted/30 py-4 px-4">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {[
              { value: '150,000+', label: 'ROs tracked' },
              { value: 'Free', label: 'to get started' },
              { value: '7-day', label: 'Pro trial, no card' },
              { value: '100%', label: 'offline-capable' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <div className="hidden md:block w-px h-6 bg-border" />}
                <div className="text-center">
                  <div className="text-base font-bold text-foreground tabular-nums">{stat.value}</div>
                  <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-14 md:py-20 px-4 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
              <span className="w-4 h-px bg-primary" />
              How it works
              <span className="w-4 h-px bg-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Up and running in minutes</h2>
          </motion.div>
          <div className="grid grid-cols-3 gap-3 md:gap-8 relative">
            <div className="hidden md:block absolute top-9 left-[22%] right-[22%] h-px bg-gradient-to-r from-border via-primary/30 to-border" />
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="bg-card rounded-xl md:rounded-2xl p-4 md:p-6 shadow-card border border-border/50 text-center space-y-2 md:space-y-3 relative"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto relative z-10">
                  <span className="text-primary font-bold text-base md:text-xl">{s.num}</span>
                </div>
                <h3 className="font-semibold text-sm md:text-base tracking-tight">{s.title}</h3>
                <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Outcomes */}
      <section className="py-14 md:py-20 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
              <span className="w-4 h-px bg-primary" />
              Why techs use it
              <span className="w-4 h-px bg-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Never leave money on the table</h2>
          </motion.div>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-10 items-center">
            <div className="space-y-3 md:space-y-4">
              {outcomes.map((o, i) => (
                <motion.div
                  key={o.title}
                  className="bg-card rounded-xl p-4 md:p-5 shadow-card border border-border/50 flex items-start gap-4"
                  initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
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
                className="w-full rounded-2xl border border-border/60 shadow-raised"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section id="screenshots" className="py-14 md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[1100px] mx-auto space-y-16 md:space-y-20">
          <div className="space-y-6 md:space-y-8">
            <motion.div
              className="max-w-2xl"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
            >
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
                <span className="w-4 h-px bg-primary" />
                Pro feature
                <span className="w-4 h-px bg-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Every RO, one place
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-2">
                Pro unlocks a full spreadsheet view with sorting, filtering, and export. Track warranty, customer-pay, and internal hours side by side — then export it for payroll or a dispute.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs md:text-sm text-muted-foreground">
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
                className="rounded-2xl border border-border/60 shadow-raised w-full"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pro feature callouts */}
      <section className="py-14 md:py-20 px-4 bg-muted/40">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
              <span className="w-4 h-px bg-primary" />
              Pro plan
              <span className="w-4 h-px bg-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">What Pro unlocks</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Infinity, title: 'Unlimited ROs', desc: 'Never hit the 150/mo cap. Log every RO on every shift without limits.' },
              { icon: Camera, title: 'RO Photo Scan', desc: 'Point your camera at a repair order — line items auto-fill in seconds via OCR.' },
              { icon: BarChart3, title: 'Period Closeouts', desc: 'Lock in your hours at period end. Compare this period vs. last to catch trends.' },
              { icon: FileSpreadsheet, title: 'Full Exports', desc: 'Send payroll CSV, audit XLSX, or PDF directly to your service manager.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="bg-card rounded-xl p-5 shadow-card border border-border/50 space-y-3 group hover:border-primary/30 hover:shadow-raised transition-all duration-200"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={i + 1}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm tracking-tight">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
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
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
              <span className="w-4 h-px bg-primary" />
              Pricing
              <span className="w-4 h-px bg-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="text-sm text-muted-foreground">Start free. Upgrade when you need more.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {/* Free */}
            <motion.div
              className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border/50 space-y-5 flex flex-col"
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
              className="rounded-2xl p-6 md:p-8 ring-2 ring-primary space-y-5 relative flex flex-col overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary) / 0.06) 100%)',
              }}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={2}
            >
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
              <div>
                <h3 className="font-semibold text-lg">Pro</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$8.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">or $79.99/yr (~$0.22/day) — saves you $27.89</p>
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
                <Button className="w-full h-11 cursor-pointer font-semibold shadow-sm">Start 7-Day Free Trial</Button>
              </Link>
              <p className="text-[11px] text-center text-muted-foreground -mt-2">
                No charge until trial ends. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 md:py-24 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[700px] mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-10"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
              <span className="w-4 h-px bg-primary" />
              FAQ
              <span className="w-4 h-px bg-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </motion.div>
          <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden divide-y divide-border/40">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-20px' }} variants={fadeUp} custom={i + 1}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 md:px-6 py-4 md:py-5 flex items-center justify-between text-left cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <span className="font-semibold text-sm md:text-base pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 md:px-6 pb-4 md:pb-5">
                        <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-28 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 50%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
          }}
        />
        <motion.div
          className="max-w-[600px] mx-auto text-center space-y-6 relative"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">Stop guessing.<br className="hidden md:block" /> Start knowing.</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-md mx-auto">
            Every hour you don't track is an hour you might not get paid for. RO Navigator gives you the record to back it up.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/auth">
              <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12 shadow-md font-semibold">
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
          <div className="flex items-center gap-2">
            <BrandMarkContainer size={24} />
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Terms</Link>
            <Link to="/support" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
