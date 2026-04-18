import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ChevronUp, Camera, FileSpreadsheet, ShieldCheck, Smartphone, Clock3, ClipboardCheck, CalendarCheck2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.png';
import { HeaderLogo } from '@/components/brand';
import { LANDING_FOOTER_LOGO_HEIGHT, LANDING_NAV_LOGO_HEIGHT } from '@/components/brand/logoSizing';

const COLORS = {
  dark: '#062F2C',
  brand: '#0F766E',
  accent: '#2DD4BF',
  surface: '#F5FBFA',
  text: '#0F172A',
  muted: '#4B5563',
  border: '#D7ECE8',
  warm: '#F59E0B',
};

const steps = [
  {
    title: 'Log ROs as you work',
    desc: 'Capture RO number, advisor, line items, and labor in seconds on phone or desktop.',
    icon: ClipboardCheck,
  },
  {
    title: 'Review before payday',
    desc: 'Spot missing hours, unresolved flags, and open tickets before checks are cut.',
    icon: Clock3,
  },
  {
    title: 'Close out with proof',
    desc: 'Export period-ready records and keep evidence when pay doesn’t match your work.',
    icon: CalendarCheck2,
  },
];

const benefits = [
  'Built for dealership and independent-shop technicians',
  'Designed for hourly + flat-rate pay verification',
  'Works on mobile and desktop with shared records',
  'Offline-friendly entry and reliable sync recovery',
];

const faqs = [
  {
    q: 'How does pricing work?',
    a: 'Every account starts with a 14-day free trial. After trial, unlock RO Navigator with a one-time $15.99 payment for lifetime access.',
  },
  {
    q: 'Is there a monthly fee?',
    a: 'No. There is no monthly or yearly subscription.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'If lifetime access is not unlocked, the app is locked until you complete the one-time purchase.',
  },
  {
    q: 'What do I get with lifetime access?',
    a: 'Full RO logging, OCR scan/import workflows, summary and closeout reporting, exports, and the full technician workflow.',
  },
  {
    q: 'Can I still use it in the shop with bad signal?',
    a: 'Yes. RO Navigator supports offline-first workflows and sync recovery.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen" style={{ background: COLORS.surface, color: COLORS.text }}>
      <header className="sticky top-0 z-40 backdrop-blur border-b" style={{ background: 'rgba(6,47,44,0.92)', borderColor: 'rgba(215,236,232,0.2)' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-[72px] flex items-center justify-between">
          <Link to="/" aria-label="RO Navigator home"><HeaderLogo scheme="dark" priority height={LANDING_NAV_LOGO_HEIGHT} /></Link>
          <nav className="flex items-center gap-2">
            {[
              ['#how-it-works', 'How it works'],
              ['#pricing', 'Pricing'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hidden md:inline px-3 py-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</a>
            ))}
            <Link to="/auth" className="hidden sm:inline px-3 py-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Sign in</Link>
            <Link to="/auth" className="inline-flex items-center h-10 px-4 rounded-md text-sm font-semibold text-white" style={{ background: COLORS.brand }}>
              Start 14-Day Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 md:px-8 pt-14 pb-16 md:pt-20 md:pb-24" style={{ background: `linear-gradient(165deg, ${COLORS.dark} 0%, #08433D 60%, #0A5550 100%)` }}>
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'rgba(45,212,191,0.14)', color: COLORS.accent }}>
              Technician-first workflow
            </div>
            <h1 className="mt-5 text-white text-[2.25rem] sm:text-[2.9rem] md:text-[3.35rem] leading-[1.05] font-bold tracking-tight">
              Track every RO.<br />
              Verify your pay.<br />
              Stop missing hours.
            </h1>
            <p className="mt-5 text-[15px] md:text-lg max-w-xl leading-relaxed" style={{ color: 'rgba(240,253,250,0.86)' }}>
              RO Navigator gives technicians a clean daily system to log work, catch missing labor, and walk into payday with proof.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 h-12 px-6 rounded-md font-semibold text-sm text-white" style={{ background: COLORS.brand }}>
                Try RO Navigator Free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-1.5 h-12 px-4 rounded-md text-sm font-medium border" style={{ color: '#E8FFFB', borderColor: 'rgba(215,236,232,0.35)' }}>
                See pricing <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'rgba(226,252,246,0.85)' }}>
              {['14-day free trial', '$15.99 one time', 'No subscription', 'Lifetime access'].map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLORS.accent }} />{chip}</span>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="rounded-2xl p-3 border shadow-2xl" style={{ background: 'rgba(245,251,250,0.08)', borderColor: 'rgba(215,236,232,0.35)' }}>
              <img src={heroMockup} alt="RO Navigator on mobile" className="w-full rounded-xl" loading="eager" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-7 border-y" style={{ background: '#ECF9F6', borderColor: COLORS.border }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            ['< 10 sec', 'to log most ROs'],
            ['Offline-ready', 'for shop floors'],
            ['OCR scan', 'photo to line items'],
            ['Desktop + mobile', 'same records'],
          ].map(([a, b]) => (
            <div key={a}><p className="text-sm font-bold">{a}</p><p className="text-xs" style={{ color: COLORS.muted }}>{b}</p></div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-4 md:px-8 py-14 md:py-20 scroll-mt-20">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How RO Navigator works</h2>
          <p className="mt-3 text-sm md:text-base max-w-2xl" style={{ color: COLORS.muted }}>
            Designed around real technician habits: fast intake, constant visibility, and clean closeout proof.
          </p>
          <div className="mt-9 grid md:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-xl border p-5" style={{ background: '#fff', borderColor: COLORS.border }}>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#E2F5F2', color: COLORS.brand }}>
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-semibold" style={{ color: COLORS.brand }}>Step {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-14 md:py-20" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why techs use it</h2>
            <p className="mt-3 text-sm md:text-base" style={{ color: COLORS.muted }}>Built for confidence before payday, not just data entry.</p>
            <div className="mt-6 space-y-2.5">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-2.5"><ShieldCheck className="h-4 w-4 mt-0.5" style={{ color: COLORS.brand }} /><p className="text-sm">{b}</p></div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border, background: '#F8FCFB' }}>
              <img src={multiperiodPreview} alt="Multi-period reporting" className="w-full rounded-lg" loading="lazy" />
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border, background: '#F8FCFB' }}>
              <img src={spreadsheetPreview} alt="Spreadsheet view" className="w-full rounded-lg" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 md:px-8 py-14 md:py-20 scroll-mt-20" style={{ background: '#ECF9F6' }}>
        <div className="max-w-[860px] mx-auto">
          <div className="rounded-2xl border p-7 md:p-10 text-center" style={{ borderColor: COLORS.border, background: '#FFFFFF' }}>
            <p className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase" style={{ background: '#FFF7E8', color: COLORS.warm }}>Simple pricing</p>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">One plan. Full access.</h2>
            <p className="mt-3 text-sm md:text-base" style={{ color: COLORS.muted }}>Start with the full product, then unlock it once.</p>
            <div className="mt-7 grid sm:grid-cols-4 gap-3 text-left">
              {[
                ['14-day free trial', 'Use the complete app first'],
                ['$15.99 one time', 'Single payment to unlock'],
                ['Lifetime access', 'No recurring billing'],
                ['No monthly fee', 'No subscription plan'],
              ].map(([title, sub]) => (
                <div key={title} className="rounded-lg border px-3 py-3" style={{ borderColor: COLORS.border, background: '#F9FDFC' }}>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{sub}</p>
                </div>
              ))}
            </div>
            <Link to="/auth" className="mt-8 inline-flex items-center justify-center gap-2 h-12 px-7 rounded-md text-white font-semibold" style={{ background: COLORS.brand }}>
              Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 md:px-8 py-14 md:py-20 scroll-mt-20">
        <div className="max-w-[860px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-7 space-y-3">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className="rounded-xl border overflow-hidden" style={{ borderColor: COLORS.border, background: '#fff' }}>
                  <button className="w-full px-4 py-4 text-left flex items-center justify-between" onClick={() => setOpenFaq(isOpen ? null : i)}>
                    <span className="font-semibold text-sm md:text-base">{item.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="px-4 pb-4 text-sm" style={{ color: COLORS.muted }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 py-14" style={{ background: COLORS.dark }}>
        <div className="max-w-[1000px] mx-auto rounded-2xl border p-8 md:p-10 text-center" style={{ borderColor: 'rgba(215,236,232,0.24)', background: 'rgba(245,251,250,0.03)' }}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Ready to stop missing hours?</h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: 'rgba(230,252,248,0.83)' }}>
            Start your 14-day free trial today. Unlock lifetime access for $15.99 when you’re ready.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-md font-semibold text-white" style={{ background: COLORS.brand }}>
              Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border text-sm font-medium" style={{ color: '#E6FCF8', borderColor: 'rgba(215,236,232,0.34)' }}>
              Unlock Lifetime Access
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 md:px-8 py-10" style={{ background: '#052825', color: 'rgba(227,252,247,0.84)' }}>
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
