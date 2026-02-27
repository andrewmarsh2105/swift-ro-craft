import { Link } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, Flag, WifiOff, ArrowRight, UserPlus, FileText, CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="h-[18px] w-[18px] text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">RO Navigator</span>
          </div>
          <Link to="/auth">
            <Button size="sm" className="cursor-pointer">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-36 px-4 overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Radial gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center space-y-7">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Track Your Hours.{' '}
            <span className="text-primary">Get Paid Right.</span>
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            The free tool built for auto techs to log repair orders, review pay periods, and make sure every hour counts.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/auth">
              <Button size="lg" className="cursor-pointer gap-2 w-full sm:w-auto text-base px-8 h-12">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
          <motion.p
            className="text-sm text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Trusted by techs at dealerships nationwide
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            custom={0}
          >
            Everything you need to stay on top of your pay
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-card rounded-2xl p-7 shadow-card hover:shadow-raised hover:-translate-y-0.5 transition-all duration-300 space-y-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro */}
      <section id="pro" className="py-20 px-4 scroll-mt-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h2
            className="text-2xl md:text-3xl font-bold tracking-tight"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            custom={0}
          >
            RO Navigator Pro
          </motion.h2>
          <motion.p
            className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            custom={1}
          >
            Scan ROs with your phone, create unlimited repair orders, and unlock multi-period reports,
            spreadsheet exports, and advanced pay-period analytics. Pro gives you the full picture so you never leave money on the table.
          </motion.p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-muted/40 scroll-mt-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.h2
            className="text-2xl md:text-3xl font-bold tracking-tight"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            custom={0}
          >
            Simple Pricing
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div
              className="bg-card rounded-2xl p-8 shadow-card space-y-3 text-left"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={1}
            >
              <h3 className="font-semibold text-lg">Free</h3>
              <p className="text-3xl font-extrabold tracking-tight">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <ul className="text-sm text-muted-foreground space-y-1.5 pt-2">
                <li>✓ Up to 150 ROs/month</li>
                <li>✓ Pay period summaries</li>
                <li>✓ Flag inbox</li>
                <li>✓ Offline mode</li>
              </ul>
            </motion.div>
            <motion.div
              className="bg-card rounded-2xl p-8 shadow-card ring-2 ring-primary space-y-3 text-left relative"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} variants={fadeUp} custom={2}
            >
              <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Popular</span>
              <h3 className="font-semibold text-lg">Pro</h3>
              <p className="text-3xl font-extrabold tracking-tight">$8.99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <ul className="text-sm text-muted-foreground space-y-1.5 pt-2">
                <li>✓ Everything in Free</li>
                <li>✓ Unlimited RO creation</li>
                <li>✓ Scan ROs with your phone</li>
                <li>✓ Multi-period reports &amp; spreadsheet export</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-14 tracking-tight"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            custom={0}
          >
            How It Works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-7 left-[20%] right-[20%] h-px bg-border" />

            {steps.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center space-y-4 relative"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto relative z-10">
                  <s.icon className="h-6 w-6 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-lg tracking-tight">{s.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/5">
        <motion.div
          className="max-w-2xl mx-auto text-center space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          custom={0}
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

      {/* Contact / Support */}
      <section id="contact" className="py-16 px-4 scroll-mt-16">
        <motion.div
          className="max-w-md mx-auto text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          custom={0}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Questions?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're here to help. Reach out anytime and we'll get back to you.
          </p>
          <a
            href="mailto:ronavigator@outlook.com"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Mail className="h-4 w-4" />
            ronavigator@outlook.com
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <p className="text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
        </p>
      </footer>
    </div>
  );
}
