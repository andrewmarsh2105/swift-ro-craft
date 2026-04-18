import { PublicPageFooter, PublicPageHeader } from '@/components/public/PublicPageChrome';

const sections = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your email address and a hashed password. When you use the app, we store your repair order data, line items, pay period summaries, and user preferences. We also collect basic analytics data (page views, feature usage) via Google Analytics 4.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'Your data is used to provide and improve the RO Navigator service. Specifically, we use it to: display your repair orders and pay summaries, process one-time lifetime unlock payments through Stripe, send transactional emails (password resets, account confirmations), and analyze usage patterns to improve the product.',
  },
  {
    title: '3. Data Storage & Security',
    body: 'Your data is stored securely using industry-standard encryption. We use Supabase for backend infrastructure, which provides row-level security to ensure users can only access their own data. Passwords are hashed and never stored in plain text.',
  },
  {
    title: '4. Third-Party Services',
    list: [
      'Stripe — for payment processing. Stripe\'s privacy policy applies to payment data.',
      'Google Analytics 4 — for anonymized usage analytics.',
    ],
  },
  {
    title: '5. Data Retention & Deletion',
    body: 'Your data is retained as long as your account is active. You may request deletion of your account and all associated data by contacting us at support@ronavigator.com.',
  },
  {
    title: '6. Cookies',
    body: 'We use essential cookies for authentication and session management. Google Analytics may set cookies for analytics purposes. No advertising cookies are used.',
  },
] as const;

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicPageHeader showBack backLabel="Back" />

      <main className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[900px]">
          <div className="rounded-2xl border border-blue-100 bg-white px-5 py-6 md:px-8 md:py-8 shadow-[0_8px_28px_-18px_rgba(8,62,167,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Legal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
            <p className="mt-2 text-sm text-slate-600">Last updated: April 18, 2026</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-700">
              This policy explains what data RO Navigator stores, how it is used, and the controls available to you.
            </p>
          </div>

          <article className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-7">
              {sections.map((section) => (
                <section key={section.title} className="space-y-2.5">
                  <h2 className="text-lg font-semibold text-slate-900 md:text-[1.12rem]">{section.title}</h2>
                  {'body' in section ? (
                    <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">{section.body}</p>
                  ) : (
                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 md:text-[15px]">
                      {section.list.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </section>
              ))}

              <section className="space-y-2.5">
                <h2 className="text-lg font-semibold text-slate-900 md:text-[1.12rem]">7. Contact</h2>
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  For privacy-related questions, contact us at{' '}
                  <a href="mailto:support@ronavigator.com" className="font-medium text-blue-700 hover:underline">support@ronavigator.com</a>.
                </p>
              </section>
            </div>
          </article>
        </div>
      </main>

      <PublicPageFooter />
    </div>
  );
}
