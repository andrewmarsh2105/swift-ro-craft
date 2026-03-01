import { Link } from 'react-router-dom';
import { Wrench, ArrowRight, ClipboardCheck, Flag, BarChart3, Check, ChevronDown, ChevronUp } from 'lucide-react';
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
  'Monthly RO limit',
  'Pay period summaries',
  'Flag inbox',
  'Offline mode',
];

const proFeatures = [
  'Unlimited ROs — no cap',
  'Scan ROs with your phone (OCR)',
  'Multi-period reports & exports',
  'Full spreadsheet view',
  'Priority support',
];

const faqs = [
  { q: 'Is RO Navigator really free?', a: 'Yes. The free plan includes pay period summaries, flags, and offline mode with no credit card required. A monthly RO limit applies.' },
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
          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground hidden md:inline transition-colors">FAQ</a>
            <Link to="/auth">
              <Button size="sm" className="cursor-pointer">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-10 md:py-16 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-[1100px] mx-auto relative">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-10 items-center">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
                Track Your Hours.{' '}
                <span className="text-primary">Get Paid Right.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Log RO lines fast, close out your pay period, and catch missing hours before payroll.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/auth">
                  <Button size="lg" className="cursor-pointer gap-2 text-base px-8 h-12">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="#screenshots"
                  className="text-sm font-medium text-primary hover:underline cursor-pointer"
                >
                  See a demo ↓
                </a>
              </div>
              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground/70">
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> Works on desktop + mobile</span>
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary flex-shrink-0" /> Close out pay periods (Pro)</span>
              </div>
              <p className="text-xs text-muted-foreground/50">
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
            How It Works
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
            Stay on top of every dollar you earn
          </motion.h2>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-10 items-center">
            {/* Cards column */}
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
            {/* Screenshot column */}
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
          {/* Spreadsheet View */}
          <div className="space-y-4 md:space-y-6">
            <motion.div
              className="max-w-2xl"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                See every RO in one place
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-2">
                Pro unlocks a full spreadsheet view with sorting, filtering, and export. Track warranty, customer-pay, and internal hours side by side.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs md:text-sm text-muted-foreground">
                {['Sort & filter by date, advisor, or type', 'Export to CSV, XLSX, or PDF', 'Compare multiple pay periods'].map((t) => (
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

          {/* Multi-period / Closeout */}
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <motion.div
              className="order-2 lg:order-1"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <img
                src={multiperiodPreview}
                alt="RO Navigator Pro multi-period comparison and closeout summary"
                className="rounded-xl md:rounded-2xl shadow-raised border border-border/50 w-full"
                loading="lazy"
              />
            </motion.div>
            <motion.div
              className="space-y-4 order-1 lg:order-2"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Close out with confidence
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Freeze your pay period, compare it against previous ones, and generate proof packs for payroll — all from your phone.
              </p>
              <div className="space-y-1.5">
                {['Snapshot hours at period end', 'Side-by-side period comparison', 'Proof pack PDF export'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section id="pricing" className="py-14 md:py-24 px-4 scroll-mt-16">
        <div className="max-w-[800px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            <motion.div
              className="bg-card rounded-xl md:rounded-2xl p-6 md:p-8 shadow-card border border-border/50 space-y-4 md:space-y-5"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <div>
                <h3 className="font-semibold text-lg">Free</h3>
                <p className="text-3xl font-extrabold tracking-tight mt-1">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-2.5">
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
              className="bg-card rounded-xl md:rounded-2xl p-6 md:p-8 shadow-card ring-2 ring-primary space-y-4 md:space-y-5 relative"
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
              <ul className="space-y-2.5">
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
      <section id="faq" className="py-14 md:py-24 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-[700px] mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-14 tracking-tight"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-2 md:space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="bg-card rounded-xl border border-border/50 overflow-hidden"
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-20px' }} variants={fadeUp} custom={i + 1}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 md:px-5 py-3.5 md:py-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 md:px-5 pb-3.5 md:pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 md:py-24 px-4">
        <motion.div
          className="max-w-[600px] mx-auto text-center space-y-5"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp} custom={0}
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ready to take control of your pay?</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
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
