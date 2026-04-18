import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock3, CalendarCheck2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.png';
import { HeaderLogo } from '@/components/brand';
import { LANDING_FOOTER_LOGO_HEIGHT, LANDING_NAV_LOGO_HEIGHT } from '@/components/brand/logoSizing';

const COLORS = {
  navy: '#081C45',
  brand: '#0B5FFF',
  brandDark: '#083EA7',
  accent: '#3B82F6',
  surface: '#EFF6FF',
  white: '#FFFFFF',
  text: '#0F172A',
  muted: '#475569',
  border: '#DBEAFE',
};

const steps = [
  {
    title: 'Log ROs while you work',
    desc: 'Capture RO number, advisor, line items, and labor quickly from phone or desktop.',
    icon: ClipboardCheck,
  },
  {
    title: 'Review before payroll closes',
    desc: 'Catch missing hours, unresolved flags, and open tickets before checks are cut.',
    icon: Clock3,
  },
  {
    title: 'Close out with proof',
    desc: 'Export clean period records so you can verify every hour with confidence.',
    icon: CalendarCheck2,
  },
];

const outcomes = [
  'Spot missing labor before payday, not after.',
  'Keep proof-ready records for disputes and corrections.',
  'Use one workflow across mobile + desktop.',
  'Stay reliable on shop floors with offline-friendly entry.',
];

const faqs = [
  {
    q: 'How does pricing work?',
    a: 'You choose when to start your 14-day free trial. After trial, continued access requires a one-time $15.99 payment for lifetime access.',
  },
  {
    q: 'Is there a monthly or yearly plan?',
    a: 'No. RO Navigator does not use recurring subscriptions.',
  },
  {
    q: 'What happens if I do not unlock after trial?',
    a: 'The app is locked when the 14-day trial ends until lifetime access is unlocked.',
  },
  {
    q: 'What is included with lifetime access?',
    a: 'RO logging, OCR scan/import workflows, summary and closeout reporting, exports, and full technician workflows.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen" style={{ background: COLORS.surface, color: COLORS.text }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: 'rgba(8,28,69,0.9)', borderColor: 'rgba(219,234,254,0.25)' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-[68px] md:h-[72px] flex items-center justify-between gap-2">
          <Link to="/" aria-label="RO Navigator home"><HeaderLogo scheme="dark" priority height={LANDING_NAV_LOGO_HEIGHT} /></Link>
          <nav className="flex items-center gap-1.5 md:gap-2">
            {[
              ['#how-it-works', 'How it works'],
              ['#results', 'Why techs use it'],
              ['#pricing', 'Pricing'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hidden md:inline px-3 py-1.5 text-sm" style={{ color: 'rgba(239,246,255,0.86)' }}>{label}</a>
            ))}
            <Link
              to="/auth"
              className="inline-flex items-center h-9 px-3 rounded-md text-sm font-medium border border-white/20 hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(239,246,255,0.92)' }}
            >
              Sign in
            </Link>
            <Link to="/auth" className="inline-flex items-center h-9 md:h-10 px-3 md:px-4 rounded-md text-[13px] md:text-sm font-semibold text-white shadow-sm" style={{ background: COLORS.brand }}>
              <span className="sm:hidden">Start free</span>
              <span className="hidden sm:inline">Start 14-Day Free Trial</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 md:px-8 pt-11 pb-14 md:pt-20 md:pb-24" style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.brandDark} 52%, ${COLORS.brand} 100%)` }}>
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(59,130,246,0.36)' }} />
        <div className="absolute top-8 right-0 h-[430px] w-[430px] rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute bottom-[-120px] left-[30%] h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(125,211,252,0.16)' }} />

        <div className="relative max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1.12fr] gap-10 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'rgba(239,246,255,0.16)', color: '#DBEAFE' }}>
              Technician-first workflow
            </div>
            <h1 className="mt-4 text-white text-[2.05rem] sm:text-[2.95rem] md:text-[3.45rem] leading-[1.01] font-bold tracking-tight">
              Track every RO.<br />
              Verify your pay.<br />
              Stop missing hours.
            </h1>
            <p className="mt-4 text-[14px] md:text-lg max-w-xl leading-relaxed" style={{ color: 'rgba(239,246,255,0.9)' }}>
              RO Navigator gives technicians a clear daily system to log work, catch pay gaps before payday, and keep proof when numbers do not match.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 md:gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 h-12 px-6 rounded-md font-semibold text-sm text-white shadow-lg" style={{ background: COLORS.brand }}>
                Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-1.5 h-12 px-4 rounded-md text-sm font-medium border" style={{ color: '#EFF6FF', borderColor: 'rgba(219,234,254,0.38)' }}>
                View offer <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mt-3.5 text-sm" style={{ color: 'rgba(219,234,254,0.95)' }}>
              14-day free trial, then one-time $15.99 lifetime unlock.
            </p>
            <div className="mt-4 inline-flex md:hidden items-center gap-2 rounded-xl border px-3 py-2" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(219,234,254,0.65)' }}>
              <ShieldCheck className="h-4 w-4" style={{ color: COLORS.brand }} />
              <div>
                <p className="text-[11px] font-semibold" style={{ color: COLORS.text }}>Proof-ready reports</p>
                <p className="text-[10px]" style={{ color: COLORS.muted }}>Before payroll is finalized</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.12 }}>
            <div className="relative">
              <div className="absolute inset-0 translate-x-5 translate-y-6 rounded-3xl" style={{ background: 'rgba(7,15,39,0.35)' }} />
              <div className="absolute -top-7 right-6 hidden md:flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: 'rgba(255,255,255,0.96)', borderColor: COLORS.border }}>
                <Sparkles className="h-4 w-4" style={{ color: COLORS.brand }} />
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: COLORS.text }}>Built for pay accuracy</p>
                  <p className="text-[10px]" style={{ color: COLORS.muted }}>Track • Review • Close out</p>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-5 hidden md:flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: 'rgba(8,28,69,0.9)', borderColor: 'rgba(219,234,254,0.35)' }}>
                <ShieldCheck className="h-4 w-4" style={{ color: '#93C5FD' }} />
                <div>
                  <p className="text-[11px] font-semibold text-white">Proof-ready reports</p>
                  <p className="text-[10px]" style={{ color: '#BFDBFE' }}>Before payroll is finalized</p>
                </div>
              </div>
              <div className="absolute -top-4 right-3 md:hidden flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shadow-sm" style={{ background: 'rgba(8,28,69,0.88)', borderColor: 'rgba(219,234,254,0.45)' }}>
                <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                <p className="text-[10px] font-semibold text-blue-100">Built for pay accuracy</p>
              </div>
              <div className="relative rounded-3xl border p-2.5 md:p-4 shadow-2xl" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(219,234,254,0.42)' }}>
                <img src={heroMockup} alt="RO Navigator product preview" className="w-full rounded-2xl" loading="eager" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-6 border-y" style={{ background: '#EAF2FF', borderColor: COLORS.border }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            ['Built for techs', 'dealership + independent shops'],
            ['Proof-first closeouts', 'before payroll finalizes'],
            ['OCR scan/import', 'from phone photos'],
            ['Desktop + mobile', 'same synced records'],
          ].map(([a, b]) => (
            <div key={a}><p className="text-sm font-bold">{a}</p><p className="text-xs" style={{ color: COLORS.muted }}>{b}</p></div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-4 md:px-8 py-11 md:py-20 scroll-mt-20" style={{ background: '#F7FAFF' }}>
        <div className="max-w-[1120px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works in the real shop day</h2>
          <p className="mt-3 text-sm md:text-base max-w-2xl" style={{ color: COLORS.muted }}>
            One connected flow from first RO touch to final closeout. No extra busywork and no guesswork at payroll time.
          </p>
          <div className="mt-8 rounded-3xl border px-4 py-7 md:px-8" style={{ borderColor: COLORS.border, background: COLORS.white }}>
            <div className="grid md:grid-cols-3 gap-7 md:gap-5">
              {steps.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#DBEAFE', color: COLORS.brand }}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.brand }}>Step {i + 1}</p>
                      <h3 className="mt-0.5 text-base font-semibold">{step.title}</h3>
                      <p className="mt-1.5 text-sm" style={{ color: COLORS.muted }}>{step.desc}</p>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-[calc(100%-12px)] w-[calc(100%-30px)] h-px" style={{ background: 'linear-gradient(90deg, #BFDBFE 0%, #DBEAFE 100%)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="results" className="px-4 md:px-8 py-11 md:py-20 scroll-mt-20">
        <div className="max-w-[1120px] mx-auto grid lg:grid-cols-[1.08fr_1fr] gap-7 lg:gap-10 items-center">
          <div className="space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Why techs keep using it</h3>
            <p className="text-sm md:text-base" style={{ color: COLORS.muted }}>
              Outcome-driven tools that make paycheck verification faster, clearer, and less stressful.
            </p>
            <div className="space-y-2.5">
              {outcomes.map((line) => (
                <div key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.brand }} />
                  <p className="text-sm md:text-[15px]">{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl blur-2xl" style={{ background: 'rgba(59,130,246,0.18)' }} />
            <div className="relative grid gap-3 rounded-3xl border p-3 md:p-4" style={{ borderColor: COLORS.border, background: COLORS.white }}>
              <img src={multiperiodPreview} alt="Multi-period reporting in RO Navigator" className="w-full rounded-xl border" style={{ borderColor: COLORS.border }} loading="lazy" />
              <div className="md:w-[80%] md:ml-auto">
                <img src={spreadsheetPreview} alt="Spreadsheet view in RO Navigator" className="w-full rounded-xl border shadow-sm" style={{ borderColor: COLORS.border }} loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 md:px-8 py-11 md:py-20 scroll-mt-20" style={{ background: '#EAF2FF' }}>
        <div className="max-w-[980px] mx-auto">
          <div className="rounded-3xl border p-7 md:p-10 lg:p-12 shadow-sm" style={{ borderColor: '#BFDBFE', background: COLORS.white }}>
            <p className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ background: '#DBEAFE', color: COLORS.brandDark }}>Simple one-time offer</p>
            <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-7 md:gap-8 items-start">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Start free, then unlock for life.</h2>
                <p className="mt-3 text-sm md:text-base" style={{ color: COLORS.muted }}>
                  Start with a 14-day free trial. After trial, unlock full RO Navigator access with a one-time $15.99 purchase.
                </p>
                <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
                  {['14-day free trial', 'One-time $15.99 payment', 'Lifetime access after purchase', 'No monthly or yearly fees'].map((line) => (
                    <div key={line} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.brand }} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border px-6 py-6 text-center min-w-[220px]" style={{ borderColor: '#BFDBFE', background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FBFF 100%)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.brandDark }}>Lifetime unlock</p>
                <p className="mt-2 text-5xl font-bold">$15.99</p>
                <p className="text-xs mt-1" style={{ color: COLORS.muted }}>one-time after trial</p>
                <Link to="/auth" className="mt-5 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md text-white text-sm font-semibold w-full" style={{ background: COLORS.brand }}>
                  Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 md:px-8 py-11 md:py-18 scroll-mt-20" style={{ background: COLORS.white }}>
        <div className="max-w-[860px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-6 space-y-2">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className="rounded-xl border px-4 md:px-5" style={{ borderColor: '#E2E8F0', background: '#FCFDFF' }}>
                  <button className="w-full py-4 text-left flex items-center justify-between gap-4" onClick={() => setOpenFaq(isOpen ? null : i)}>
                    <span className="font-semibold text-sm md:text-base">{item.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="pb-4 text-sm" style={{ color: COLORS.muted }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-11 md:py-14" style={{ background: COLORS.navy }}>
        <div className="max-w-[1000px] mx-auto rounded-3xl border p-8 md:p-10 text-center" style={{ borderColor: 'rgba(219,234,254,0.3)', background: 'rgba(255,255,255,0.04)' }}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Ready to stop missing hours?</h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: 'rgba(239,246,255,0.9)' }}>
            Start now and run your full RO process with clear records from day one.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-md font-semibold text-white" style={{ background: COLORS.brand }}>
              Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 md:px-8 py-10" style={{ background: '#061739', color: 'rgba(239,246,255,0.82)' }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeaderLogo scheme="dark" height={LANDING_FOOTER_LOGO_HEIGHT} />
            <span className="text-xs">Built for technicians who verify every hour.</span>
          </div>
          <div className="text-xs flex items-center gap-4">
            <Link to="/terms" className="hover:opacity-90">Terms</Link>
            <Link to="/privacy" className="hover:opacity-90">Privacy</Link>
            <Link to="/auth" className="hover:opacity-90">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
