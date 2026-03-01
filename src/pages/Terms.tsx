import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 max-w-5xl mx-auto px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="h-[18px] w-[18px] text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">RO Navigator</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 1, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using RO Navigator ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>RO Navigator is a web application that helps automotive technicians track repair orders, labor hours, and pay periods. The Service is provided on a free tier with optional paid Pro features.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Accounts</h2>
            <p>You must provide a valid email address to create an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Free & Pro Plans</h2>
            <p>Free accounts are limited to 150 repair orders per calendar month. Pro subscriptions are billed monthly ($8.99/mo) or yearly ($79.99/yr) and include a 7-day free trial. You may cancel at any time through the billing portal. Refunds are handled on a case-by-case basis.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p>You agree not to misuse the Service, including but not limited to: attempting to gain unauthorized access, interfering with other users, uploading malicious content, or using the Service for illegal purposes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data Ownership</h2>
            <p>You retain ownership of all data you enter into RO Navigator. We do not sell or share your data with third parties except as described in our Privacy Policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of pay calculations — always verify with your employer's records.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>RO Navigator shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including lost wages or pay disputes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance. Material changes will be communicated via email.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>Questions about these terms? Contact us at <a href="mailto:ronavigator@outlook.com" className="text-primary hover:underline">ronavigator@outlook.com</a>.</p>
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
