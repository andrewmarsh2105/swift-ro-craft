import { PublicPageFooter, PublicPageHeader } from '@/components/public/PublicPageChrome';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using RO Navigator ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
  },
  {
    title: '2. Description of Service',
    body: 'RO Navigator is a web application that helps automotive technicians track repair orders, labor hours, and pay periods. New accounts can choose to start a 14-day free trial. After the trial ends, continued access requires a one-time $15.99 lifetime unlock.',
  },
  {
    title: '3. Accounts',
    body: 'You must provide a valid email address to create an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this Service.',
  },
  {
    title: '4. Trial & Lifetime Access',
    body: 'New accounts can start a 14-day free trial with full app functionality. After trial expiration, continued use requires a one-time $15.99 payment that unlocks lifetime access. There are no recurring monthly or yearly subscription fees.',
  },
  {
    title: '5. Acceptable Use',
    body: 'You agree not to misuse the Service, including but not limited to: attempting to gain unauthorized access, interfering with other users, uploading malicious content, or using the Service for illegal purposes.',
  },
  {
    title: '6. Data Ownership',
    body: 'You retain ownership of all data you enter into RO Navigator. We do not sell or share your data with third parties except as described in our Privacy Policy.',
  },
  {
    title: '7. Disclaimer of Warranties',
    body: 'The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of pay calculations — always verify with your employer\'s records.',
  },
  {
    title: '8. Limitation of Liability',
    body: 'RO Navigator shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including lost wages or pay disputes.',
  },
  {
    title: '9. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance. Material changes will be communicated via email.',
  },
] as const;

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicPageHeader showBack backLabel="Back" />

      <main className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[900px]">
          <div className="rounded-2xl border border-blue-100 bg-white px-5 py-6 md:px-8 md:py-8 shadow-[0_8px_28px_-18px_rgba(8,62,167,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Legal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>
            <p className="mt-2 text-sm text-slate-600">Last updated: April 18, 2026</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-700">
              These terms govern your use of RO Navigator. They are written to keep expectations clear around access, usage, and responsibilities.
            </p>
          </div>

          <article className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-7">
              {sections.map((section) => (
                <section key={section.title} className="space-y-2.5">
                  <h2 className="text-lg font-semibold text-slate-900 md:text-[1.12rem]">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">{section.body}</p>
                </section>
              ))}

              <section className="space-y-2.5">
                <h2 className="text-lg font-semibold text-slate-900 md:text-[1.12rem]">10. Contact</h2>
                <p className="text-sm leading-relaxed text-slate-700 md:text-[15px]">
                  Questions about these terms? Contact us at{' '}
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
