import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../lib/siteConfig';
import { LEGAL_LINKS } from '../lib/legalLinks';
import { CrossAccent } from '../design-system';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#171044] py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:py-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation / Back link */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#171044]/70 hover:text-[#FF5A00] transition-colors"
          >
            <ArrowLeft size={16} /> Return to Home
          </Link>
          <div className="flex gap-4 text-xs font-semibold">
            {LEGAL_LINKS.filter((l) => l.path !== '/terms').map((l) => (
              <Link key={l.path} to={l.path} className="text-[#171044]/60 hover:text-[#171044] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="bg-[#171044] text-white p-8 md:p-12 rounded-3xl shadow-xl border border-white/10 mb-10 print:bg-transparent print:text-black print:p-0 print:border-none print:shadow-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-[#D8F500] uppercase tracking-wider mb-4 print:hidden">
            <FileText size={14} /> Platform Agreement
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-white print:text-black">
            Terms of Service <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/80 max-w-2xl print:text-neutral-700">
            Conditions governing access and use of the {SITE_CONFIG.ACADEMY_NAME} athletic platform, portals, and competitive fixtures.
          </p>
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/60 print:text-neutral-500">
            <span>Platform: <strong className="text-white print:text-black">{SITE_CONFIG.ACADEMY_NAME}</strong></span>
          </div>
        </header>

        {/* Table of Contents */}
        <nav aria-label="Table of contents" className="bg-white p-6 rounded-2xl border border-[#171044]/10 shadow-sm mb-10 print:hidden">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#171044] mb-3">
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#171044]/80">
            <li><a href="#acceptance" className="hover:text-[#FF5A00] transition-colors">1. Acceptance of Terms</a></li>
            <li><a href="#eligibility" className="hover:text-[#FF5A00] transition-colors">2. Eligibility &amp; Minor Consent</a></li>
            <li><a href="#accounts-roles" className="hover:text-[#FF5A00] transition-colors">3. Accounts &amp; Platform Roles</a></li>
            <li><a href="#acceptable-use" className="hover:text-[#FF5A00] transition-colors">4. Acceptable Platform Use</a></li>
            <li><a href="#user-content" className="hover:text-[#FF5A00] transition-colors">5. User Content &amp; Media</a></li>
            <li><a href="#tournaments-scores" className="hover:text-[#FF5A00] transition-colors">6. Tournaments &amp; Live Scores</a></li>
            <li><a href="#ip" className="hover:text-[#FF5A00] transition-colors">7. Intellectual Property</a></li>
            <li><a href="#liability" className="hover:text-[#FF5A00] transition-colors">8. Availability &amp; Limitation of Liability</a></li>
            <li><a href="#suspension" className="hover:text-[#FF5A00] transition-colors">9. Account Suspension &amp; Termination</a></li>
            <li><a href="#privacy-link" className="hover:text-[#FF5A00] transition-colors">10. Privacy &amp; Data Protection</a></li>
            <li><a href="#contact" className="hover:text-[#FF5A00] transition-colors">11. Contact Details</a></li>
          </ol>
        </nav>

        {/* Content Body */}
        <div className="space-y-10 text-sm md:text-base leading-relaxed text-[#171044]/90 bg-white p-8 md:p-12 rounded-3xl border border-[#171044]/10 shadow-sm print:shadow-none print:p-0 print:border-none">
          <section id="acceptance" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or creating an account on {SITE_CONFIG.ACADEMY_NAME}, you agree to comply with and be bound by these Terms of Service and all related policies. If you do not agree to these terms, you must discontinue using the platform immediately.
            </p>
          </section>

          <section id="eligibility" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              2. Eligibility &amp; Minor Consent
            </h2>
            <p>
              Our academy serves athletes of various age divisions, including youth athletes under the age of majority. For any minor athlete, account creation, team registration, and program participation require the explicit authorization and supervision of a parent or legal guardian.
            </p>
          </section>

          <section id="accounts-roles" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              3. Accounts &amp; Platform Roles
            </h2>
            <p className="mb-2">
              Each user account is tied to a specific operational role within the academy:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-[#171044]/80">
              <li><strong>Admin:</strong> Manages overall academy sports, venues, coaching assignments, rosters, and administrative accounts.</li>
              <li><strong>Coach:</strong> Plans training drills, logs squad attendance, submits skill evaluations, and enters development feedback for assigned rosters.</li>
              <li><strong>Athlete:</strong> Views personal training schedules, match assignments, individual development goals, and evaluations.</li>
              <li><strong>Organizer:</strong> Oversees tournament fixtures, referee assignments, team registrations, brackets, and venue schedules.</li>
            </ul>
            <p className="mt-3 text-xs text-[#171044]/70">
              You are responsible for keeping your login credentials confidential and must notify academy administration immediately of any unauthorized account access.
            </p>
          </section>

          <section id="acceptable-use" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              4. Acceptable Platform Use
            </h2>
            <p>
              You agree to use the platform solely for lawful athletic, administrative, and educational purposes. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-[#171044]/80 mt-2">
              <li>Attempt to bypass authentication, session cookies, or role-based access restrictions.</li>
              <li>Transmit automated spam, malicious code, or conduct denial-of-service attempts.</li>
              <li>Submit forged attendance records, manipulated match results, or falsified medical information.</li>
              <li>Harass, threaten, or demean coaches, officials, athletes, or guardians.</li>
            </ul>
          </section>

          <section id="user-content" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              5. User Content &amp; Media
            </h2>
            <p>
              Users may upload profile photographs, training documents, and communicate via message channels. You retain ownership of content you submit, but grant {SITE_CONFIG.ACADEMY_NAME} a non-exclusive license to use, display, and store such content solely as required to deliver academy operations.
            </p>
          </section>

          <section id="tournaments-scores" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              6. Tournaments &amp; Live Scores
            </h2>
            <p>
              Live match feeds, score tickers, and competition standings are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. While officials strive for real-time accuracy, scores, timestamps, and cautions may be subject to review, correction, and post-match audit by tournament organizers and lead officials.
            </p>
          </section>

          <section id="ip" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              7. Intellectual Property
            </h2>
            <p>
              All software interfaces, trademarks, badges, logos, graphic assets, and training methodologies displayed on {SITE_CONFIG.ACADEMY_NAME} are the proprietary intellectual property of {SITE_CONFIG.LEGAL_ENTITY_NAME} and its licensors.
            </p>
          </section>

          <section id="liability" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              8. Availability &amp; Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, {SITE_CONFIG.LEGAL_ENTITY_NAME} provides the digital platform without warranties of any kind, whether express or implied. We do not guarantee uninterrupted or error-free platform operation. In no event shall the academy or its personnel be liable for indirect, incidental, or consequential damages arising from platform usage.
            </p>
          </section>

          <section id="suspension" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              9. Account Suspension &amp; Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, breach our Code of Conduct, or compromise the safety and integrity of academy athletes and operations.
            </p>
          </section>

          <section id="privacy-link" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              10. Privacy &amp; Data Protection
            </h2>
            <p>
              Our collection and processing of personal information are governed by our{' '}
              <Link to="/privacy" className="text-[#FF5A00] font-bold underline hover:text-[#e04f00]">
                Privacy Policy
              </Link>, which forms an integral part of these Terms.
            </p>
          </section>

          <section id="contact" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              11. Contact Details
            </h2>
            <p className="mb-2">
              Questions regarding these Terms of Service should be directed to:
            </p>
            <div className="bg-[#171044]/5 p-4 rounded-xl border border-[#171044]/10 text-xs md:text-sm space-y-1">
              <div><strong>Academy:</strong> {SITE_CONFIG.ACADEMY_NAME}</div>
              <div><strong>Entity:</strong> {SITE_CONFIG.LEGAL_ENTITY_NAME}</div>
              <div><strong>Email:</strong> <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="text-[#FF5A00] font-bold">{SITE_CONFIG.CONTACT_EMAIL}</a></div>
              <div><strong>Address:</strong> {SITE_CONFIG.CONTACT_ADDRESS}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
