import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-5xl mx-auto px-4">
          <Link to="/">
            <Logo variant="full" scheme="auto" size="md" className="text-foreground" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 1, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>When you create an account, we collect your email address and a hashed password. When you use the app, we store your repair order data, line items, pay period summaries, and user preferences. We also collect basic analytics data (page views, feature usage) via Google Analytics 4.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>Your data is used to provide and improve the RO Navigator service. Specifically, we use it to: display your repair orders and pay summaries, process payments through Stripe, send transactional emails (password resets, account confirmations), and analyze usage patterns to improve the product.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Security</h2>
            <p>Your data is stored securely using industry-standard encryption. We use Lovable Cloud for backend infrastructure, which provides row-level security to ensure users can only access their own data. Passwords are hashed and never stored in plain text.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Stripe</strong> — for payment processing. Stripe's privacy policy applies to payment data.</li>
              <li><strong>Google Analytics 4</strong> — for anonymized usage analytics.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention & Deletion</h2>
            <p>Your data is retained as long as your account is active. You may request deletion of your account and all associated data by contacting us at <a href="mailto:support@ronavigator.com" className="text-primary hover:underline">support@ronavigator.com</a>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p>We use essential cookies for authentication and session management. Google Analytics may set cookies for analytics purposes. No advertising cookies are used.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:support@ronavigator.com" className="text-primary hover:underline">support@ronavigator.com</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <p className="text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} RO Navigator. Built for techs, by techs.
        </p>
      </footer>
    </div>
  );
}
