import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock3, CalendarCheck2, ShieldCheck, Sparkles, Wrench, FileCheck2, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import heroMockup from '@/assets/hero-mockup.png';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.png';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.png';
import { PublicPageFooter, PublicPageHeader } from '@/components/public/PublicPageChrome';

const COLORS = {
  navy: '#081C45',
  brand: '#0B5FFF',
  brandDark: '#083EA7',
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
      <PublicPageHeader
        dark
        maxWidthClassName="max-w-[1200px]"
        rightSlot={(
          <nav className="flex items-center gap-1.5 md:gap-2">
            {[
              ['#proof', 'Proof'],
              ['#how-it-works', 'How it works'],
              ['#results', 'Outcomes'],
              ['#pricing', 'Pricing'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="hidden rounded-md px-3 py-1.5 text-sm text-blue-100/85 hover:bg-white/10 md:inline">
                {label}
              </a>
            ))}
            <Link
              to="/auth"
              className="inline-flex h-9 items-center rounded-md border border-white/20 px-3 text-sm font-medium text-blue-50/95 hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold text-white shadow-sm md:text-sm"
              style={{ background: COLORS.brand }}
            >
              Start 14-Day Free Trial
            </Link>
          </nav>
        )}
      />

      <section className="relative overflow-hidden px-4 pb-14 pt-11 md:px-8 md:pb-24 md:pt-20" style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.brandDark} 52%, ${COLORS.brand} 100%)` }}>
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(59,130,246,0.36)' }} />
        <div className="absolute right-0 top-8 h-[430px] w-[430px] rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute bottom-[-120px] left-[30%] h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(125,211,252,0.16)' }} />

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[1fr_1.12fr] lg:gap-12">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
              Built for technicians
            </div>
            <h1 className="mt-4 text-[2.05rem] font-bold leading-[1.01] tracking-tight text-white sm:text-[2.95rem] md:text-[3.45rem]">
              Track every RO.<br />
              Verify your pay.<br />
              Keep proof you can trust.
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-blue-100/90 md:text-lg">
              RO Navigator gives technicians one reliable system for daily logging, pre-payroll review, and closeout records across mobile and desktop.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 md:gap-3">
              <Link to="/auth" className="inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-semibold text-white shadow-lg" style={{ background: COLORS.brand }}>
                Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="inline-flex h-12 items-center gap-1.5 rounded-md border px-4 text-sm font-medium text-blue-50" style={{ borderColor: 'rgba(219,234,254,0.38)' }}>
                View offer <ChevronDown className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mt-3.5 text-sm text-blue-100/95">
              14-day free trial, then one-time $15.99 lifetime unlock. No recurring subscription.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.12 }}>
            <div className="relative">
              <div className="absolute inset-0 translate-x-5 translate-y-6 rounded-3xl bg-[#070F27]/35" />
              <div className="absolute -top-7 right-6 hidden items-center gap-2 rounded-xl border border-blue-100 bg-white/95 px-3 py-2 md:flex">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-900">Technician-first workflow</p>
                  <p className="text-[10px] text-slate-600">Track • Review • Close out</p>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-5 hidden items-center gap-2 rounded-xl border border-blue-200/45 bg-[#081C45]/90 px-3 py-2 md:flex">
                <ShieldCheck className="h-4 w-4 text-blue-200" />
                <div>
                  <p className="text-[11px] font-semibold text-white">Proof-ready reports</p>
                  <p className="text-[10px] text-blue-100">Before payroll is finalized</p>
                </div>
              </div>
              <div className="relative rounded-3xl border border-blue-100/45 bg-white/10 p-2.5 shadow-2xl md:p-4">
                <img src={heroMockup} alt="RO Navigator dashboard and RO tracking views" className="w-full rounded-2xl" loading="eager" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="proof" className="scroll-mt-20 border-y px-4 py-9 md:px-8" style={{ background: '#EAF2FF', borderColor: COLORS.border }}>
        <div className="mx-auto max-w-[1120px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Proof & credibility</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Built for technicians', detail: 'Dealership and independent-shop workflows.', icon: Wrench },
              { title: 'Proof-ready records', detail: 'Period closeout artifacts and export paths.', icon: FileCheck2 },
              { title: 'Desktop + mobile', detail: 'Same account and data continuity across devices.', icon: Monitor },
              { title: 'Simple pricing', detail: '14-day trial + one-time lifetime unlock.', icon: Smartphone },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-blue-100 bg-white/80 p-4">
                <item.icon className="h-4 w-4 text-blue-600" />
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#F7FAFF] px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1120px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Workflow</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">How it works in the real shop day</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
            One connected flow from first RO touch to payroll closeout. Designed for speed during the day and clarity at pay time.
          </p>
          <div className="mt-8 rounded-3xl border border-blue-100 bg-white px-4 py-7 md:px-8">
            <div className="grid gap-7 md:grid-cols-3 md:gap-5">
              {steps.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step {i + 1}</p>
                      <h3 className="mt-0.5 text-base font-semibold">{step.title}</h3>
                      <p className="mt-1.5 text-sm text-slate-600">{step.desc}</p>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-[calc(100%-12px)] top-5 hidden h-px w-[calc(100%-30px)] bg-gradient-to-r from-blue-200 to-blue-100 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="results" className="scroll-mt-20 px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1120px] items-center gap-7 lg:grid-cols-[1.08fr_1fr] lg:gap-10">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Outcomes</p>
            <h3 className="text-3xl font-bold tracking-tight md:text-4xl">Why techs keep using it</h3>
            <p className="text-sm text-slate-600 md:text-base">
              RO Navigator helps technicians protect paycheck accuracy with less friction during daily work.
            </p>
            <div className="space-y-2.5">
              {outcomes.map((line) => (
                <div key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                  <p className="text-sm md:text-[15px]">{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-blue-500/15 blur-2xl" />
            <div className="relative grid gap-3 rounded-3xl border border-blue-100 bg-white p-3 md:p-4">
              <figure>
                <img src={multiperiodPreview} alt="RO Navigator multi-period summary reporting" className="w-full rounded-xl border border-blue-100" loading="lazy" />
                <figcaption className="mt-1.5 text-[11px] text-slate-500">Period comparison and summary visibility before closeout.</figcaption>
              </figure>
              <figure className="md:ml-auto md:w-[80%]">
                <img src={spreadsheetPreview} alt="RO Navigator spreadsheet payroll view" className="w-full rounded-xl border border-blue-100 shadow-sm" loading="lazy" />
                <figcaption className="mt-1.5 text-[11px] text-slate-500">Detailed line-item review for payroll verification.</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-[#EAF2FF] px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto max-w-[980px]">
          <div className="rounded-3xl border border-blue-200 bg-white p-7 shadow-sm md:p-10 lg:p-12">
            <p className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-800">Offer</p>
            <div className="mt-5 grid items-start gap-7 md:grid-cols-[1fr_auto] md:gap-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Straightforward pricing.</h2>
                <p className="mt-3 text-sm text-slate-600 md:text-base">
                  Start with a 14-day free trial. After trial, unlock full RO Navigator access with a one-time $15.99 purchase.
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {['14-day free trial', 'One-time $15.99 payment', 'Lifetime access after purchase', 'No monthly or yearly fees'].map((line) => (
                    <div key={line} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-[220px] rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-[#F8FBFF] px-6 py-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Lifetime unlock</p>
                <p className="mt-2 text-5xl font-bold">$15.99</p>
                <p className="mt-1 text-xs text-slate-600">one-time after trial</p>
                <Link to="/auth" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0B5FFF] px-5 text-sm font-semibold text-white">
                  Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-white px-4 py-12 md:px-8 md:py-18">
        <div className="mx-auto max-w-[860px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Clear answers before you start</h2>
          <div className="mt-6 space-y-2">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className="rounded-xl border border-slate-200 bg-[#FCFDFF] px-4 md:px-5">
                  <button className="flex w-full items-center justify-between gap-4 py-4 text-left" onClick={() => setOpenFaq(isOpen ? null : i)}>
                    <span className="text-sm font-semibold md:text-base">{item.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="pb-4 text-sm text-slate-600">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#081C45] px-4 py-11 md:px-8 md:py-14">
        <div className="mx-auto max-w-[1000px] rounded-3xl border border-blue-100/30 bg-white/5 p-8 text-center md:p-10">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Ready to run payroll weeks with confidence?</h2>
          <p className="mt-3 text-sm text-blue-100/90 md:text-base">
            Start now and run your full RO process with clear records from day one.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0B5FFF] px-7 font-semibold text-white">
              Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicPageFooter dark />
    </div>
  );
}
