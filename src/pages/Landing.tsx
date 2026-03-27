import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Check, ChevronDown, ChevronUp, InfinityIcon, Camera, FileSpreadsheet } from 'lucide-react';
import { Logo } from '@/components/brand';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.png';

// Brand colors — navy from existing --brand-navy token
const NAVY = '#0C1829';
const AMBER = 'hsl(37, 86%, 44%)';

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
    title: 'Close Out Pay Periods',
    desc: 'Freeze your hours at the end of each period. Know exactly what you earned before the check arrives — no more surprises.',
  },
  {
    title: 'Flag & Resolve Issues',
    desc: "Mark questionable charges, missing hours, or advisor disputes. Track every flag until it's resolved.",
  },
  {
    title: 'Compare Pay Periods',
    desc: 'See how this week stacks up against last. Spot trends in your hours and catch patterns early.',
  },
];

const freeFeatures = [
  'Up to 25 ROs per month',
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
    a: 'Yes. The free plan includes up to 25 ROs per month, pay period summaries, flag inbox, offline mode, and quick-add presets — no credit card required. Need more? Pro has no cap.',
  },
  {
    q: 'Who is RO Navigator built for?',
    a: 'Automotive technicians at dealerships and independent shops who get paid hourly or flat-rate and want to track their repair orders, verify their pay, and close out pay periods without guessing.',
  },
  {
    q: 'What does Pro add?',
    a: "Pro adds phone scanning (snap a photo → auto-fill lines), unlimited ROs, multi-period comparisons, full spreadsheet exports (CSV/XLSX/PDF), and payroll-ready closeouts. It's $8.99/mo or $79.99/yr — both include a 7-day free trial.",
  },
  {
    q: 'How does the 7-day free trial work?',
    a: "You get full Pro access for 7 days at no charge. You won't be billed until the trial ends. Cancel anytime from Settings → Manage Subscription before the trial is up and you pay nothing.",
  },
  {
    q: 'Can I use it offline in the shop?',
    a: "Yes. You can log ROs and line items without a signal. Everything syncs automatically when you're back online — no lost data.",
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
    <div className="min-h-screen">

      {/* ── Navigation ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{ background: NAVY, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-14 px-4 md:px-8">
          <Logo variant="full" scheme="dark" size="md" />
          <nav className="flex items-center gap-1">
            <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white hidden md:inline px-3 py-1.5 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white hidden md:inline px-3 py-1.5 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-slate-400 hover:text-white hidden md:inline px-3 py-1.5 transition-colors">
              FAQ
            </a>
            <div className="hidden sm:block w-px h-5 mx-2" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center px-4 h-9 text-sm font-bold rounded-[3px] transition-opacity hover:opacity-90"
              style={{ background: AMBER, color: NAVY }}
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        className="px-4 md:px-8 pt-14 pb-20 md:pt-20 md:pb-28"
        style={{ background: NAVY }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left */}
            <motion.div
              className="space-y-7"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Eyebrow */}
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-px" style={{ background: AMBER }} />
                <span
                  className="text-xs font-mono font-semibold uppercase tracking-widest"
                  style={{ color: AMBER }}
                >
                  For flat-rate technicians
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-[2.6rem] md:text-[3.25rem] lg:text-[3.75rem] font-bold tracking-tight leading-[1.06] text-white">
                Stop leaving<br />
                hours on<br />
                the table.
              </h1>

              {/* Sub */}
              <p className="text-base md:text-lg leading-relaxed text-slate-400 max-w-[420px]">
                Know exactly what you're owed before payday. Log ROs as you work, catch missing hours, and close out every pay period with proof.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-7 h-12 text-sm font-bold tracking-wide rounded-[3px] transition-opacity hover:opacity-90"
                  style={{ background: AMBER, color: NAVY }}
                >
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  See pricing <ChevronDown className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Trust strip */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: AMBER }} />
                  Free to start — no credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: AMBER }} />
                  Works offline in the shop
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: AMBER }} />
                  Mobile + desktop
                </span>
              </div>
            </motion.div>

            {/* Right: Mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <img
                src={heroMockup}
                alt="RO Navigator app showing repair order tracking on a mobile phone"
                className="w-full mx-auto rounded-lg"
                style={{ border: '1px solid rgba(255,255,255,0.1)', maxWidth: '480px' }}
                loading="eager"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <section style={{ background: AMBER }} className="py-4 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { value: 'Free Plan', label: 'no credit card needed' },
              { value: 'Offline-first', label: 'works without Wi-Fi' },
              { value: '< 10 sec', label: 'to log an RO' },
              { value: '7-day trial', label: 'full Pro access free' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-sm font-bold tabular-nums" style={{ color: NAVY }}>{stat.value}</div>
                <div className="text-[11px] font-medium" style={{ color: 'rgba(12, 24, 41, 0.55)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem statement ───────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-8 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-6">
              The problem
            </p>
            <h2
              className="font-display text-3xl md:text-[2.75rem] lg:text-[3.25rem] font-bold tracking-tight leading-[1.1]"
              style={{ color: NAVY }}
            >
              Most techs have no record<br className="hidden md:block" /> of what they worked.<br className="hidden md:block" /> Until payday — when it's too late.
            </h2>
            <p className="text-base md:text-lg text-slate-500 leading-relaxed mt-6 max-w-xl">
              RO Navigator fixes that. Track every RO as you write it, flag issues in real time, and walk into every pay period with proof — not guesses.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 md:px-8 scroll-mt-16" style={{ background: '#F7F4EF' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] gap-12 md:gap-16 items-start">

            {/* Left sticky */}
            <div className="md:sticky md:top-24">
              <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
                How it works
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
                Up and running<br />in minutes.
              </h2>
              <Link
                to="/auth"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: AMBER }}
              >
                Get started free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Steps */}
            <div>
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  className="flex gap-6 md:gap-8 py-8 items-start"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #E5DDD1' }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-30px' }}
                  variants={fadeUp}
                  custom={i}
                >
                  <span
                    className="font-display text-5xl md:text-6xl font-black tabular-nums leading-none flex-shrink-0 w-14 text-right"
                    style={{ color: AMBER }}
                  >
                    0{step.num}
                  </span>
                  <div className="pt-2">
                    <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Key outcomes ────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Why techs use it
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
              Never leave money on the table.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              {outcomes.map((o, i) => (
                <motion.div
                  key={o.title}
                  className="py-7 flex items-start gap-5"
                  style={{ borderTop: '1px solid #E5DDD1' }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <span className="text-xs font-mono text-slate-400 pt-0.5 flex-shrink-0 w-5">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold mb-1.5" style={{ color: NAVY }}>{o.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{o.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-4 md:mt-0"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <img
                src={multiperiodPreview}
                alt="RO Navigator closeout and compare periods view"
                className="w-full rounded-lg border border-[#E5DDD1]"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Spreadsheet / Pro feature ───────────────────────── */}
      <section id="screenshots" className="py-16 md:py-24 px-4 md:px-8 scroll-mt-16" style={{ background: '#F7F4EF' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            <motion.div
              className="order-2 md:order-1"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <img
                src={spreadsheetPreview}
                alt="RO Navigator Pro spreadsheet view with RO data and hours columns"
                className="w-full rounded-lg border border-[#E5DDD1]"
                loading="lazy"
              />
            </motion.div>

            <motion.div
              className="order-1 md:order-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">
                Pro feature
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" style={{ color: NAVY }}>
                Every RO,<br />one place.
              </h2>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed mb-6">
                Pro unlocks a full spreadsheet view with sorting, filtering, and export. Track warranty, customer-pay, and internal hours side by side — then export it for payroll or a dispute.
              </p>
              <div className="space-y-3">
                {[
                  'Sort & filter by date, advisor, or type',
                  'Export to CSV, XLSX, or PDF',
                  'Compare multiple pay periods side by side',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: AMBER }} />
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Pro feature callouts (dark) ─────────────────────── */}
      <section style={{ background: NAVY }} className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: AMBER }}>
              Pro plan
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
              What Pro unlocks
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: InfinityIcon, title: 'Unlimited ROs', desc: 'Log every RO on every shift — no limits, no counting.' },
              { icon: Camera, title: 'RO Photo Scan', desc: 'Point your camera at a repair order — line items auto-fill in seconds via OCR.' },
              { icon: BarChart3, title: 'Period Closeouts', desc: 'Lock in your hours at period end. Compare this period vs. last to catch trends.' },
              { icon: FileSpreadsheet, title: 'Full Exports', desc: 'Send payroll CSV, audit XLSX, or PDF directly to your service manager.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="pt-6 space-y-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <item.icon className="h-5 w-5 text-slate-400" />
                <h3 className="font-semibold text-sm text-white">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="py-16 md:py-24 px-4 md:px-8 scroll-mt-16 bg-white">
        <div className="max-w-[820px] mx-auto">

          <div className="mb-10 md:mb-14">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Pricing
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
              Simple, honest pricing.
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">

            {/* Free */}
            <motion.div
              className="border border-[#E5DDD1] rounded-lg p-6 md:p-8 flex flex-col gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Free
                </div>
                <div className="text-4xl font-black" style={{ color: NAVY }}>
                  $0<span className="text-base font-normal text-slate-400">/mo</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">No credit card, no expiration.</div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="flex items-center justify-center h-11 border text-sm font-semibold rounded-sm transition-all hover:opacity-80"
                style={{ borderColor: NAVY, color: NAVY }}
              >
                Get Started Free
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div
              className="rounded-lg p-6 md:p-8 flex flex-col gap-6"
              style={{ background: NAVY }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="text-[11px] font-mono font-semibold uppercase tracking-widest"
                    style={{ color: AMBER }}
                  >
                    Pro
                  </div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm"
                    style={{ background: AMBER, color: NAVY }}
                  >
                    7-day trial
                  </div>
                </div>
                <div className="text-4xl font-black text-white">
                  $8.99<span className="text-base font-normal text-slate-400">/mo</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">or $79.99/yr — saves you $27.89</div>
              </div>
              <ul className="space-y-2.5 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: AMBER }} />
                    <span className={f === 'Everything in Free' ? 'text-slate-500' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="flex items-center justify-center h-11 text-sm font-bold rounded-sm transition-opacity hover:opacity-90"
                style={{ background: AMBER, color: NAVY }}
              >
                Start 7-Day Free Trial
              </Link>
              <p className="text-[11px] text-center text-slate-600 -mt-2">
                No charge until trial ends. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24 px-4 md:px-8 scroll-mt-16" style={{ background: '#F7F4EF' }}>
        <div className="max-w-[700px] mx-auto">

          <div className="mb-10">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: NAVY }}>
              Questions & answers
            </h2>
          </div>

          <div>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                style={{ borderTop: '1px solid #E5DDD1' }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.3}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full py-5 flex items-start justify-between text-left cursor-pointer group"
                >
                  <span
                    className="font-semibold text-sm md:text-base pr-4 group-hover:opacity-75 transition-opacity"
                    style={{ color: NAVY }}
                  >
                    {faq.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
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
                      <div className="pb-5">
                        <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {/* Bottom rule */}
            <div style={{ borderTop: '1px solid #E5DDD1' }} />
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section style={{ background: NAVY }} className="py-20 md:py-32 px-4 md:px-8 relative overflow-hidden">
        {/* Subtle amber gradient accent on right */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 pointer-events-none hidden lg:block"
          style={{ background: 'linear-gradient(270deg, rgba(212, 137, 10, 0.04) 0%, transparent 100%)' }}
        />
        <motion.div
          className="max-w-[1100px] mx-auto relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] mb-6"
              style={{ color: AMBER }}
            >
              Get started today
            </p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] text-white mb-6">
              Stop guessing.<br />
              Start knowing.
            </h2>
            <p className="text-base text-slate-400 leading-relaxed mb-8 max-w-lg">
              Every hour you don't track is an hour you might not get paid for. RO Navigator gives you the record to back it up.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-7 h-12 text-sm font-bold tracking-wide rounded-[3px] transition-opacity hover:opacity-90"
                style={{ background: AMBER, color: NAVY }}
              >
                Create Your Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center px-7 h-12 text-sm font-medium border rounded-[3px] text-white transition-all hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Sign In
              </Link>
            </div>
            <p className="text-xs text-slate-600 mt-5">No credit card required to start.</p>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="px-4 md:px-8 py-8"
        style={{ background: NAVY, borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="full" scheme="dark" size="sm" />
            <span className="text-xs text-slate-600">
              © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
            </span>
          </div>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Terms</Link>
            <Link to="/support" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
