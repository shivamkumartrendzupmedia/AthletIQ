import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../lib/siteConfig';
import { LEGAL_LINKS } from '../lib/legalLinks';
import { CrossAccent } from '../design-system';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
            {LEGAL_LINKS.filter((l) => l.path !== '/privacy').map((l) => (
              <Link key={l.path} to={l.path} className="text-[#171044]/60 hover:text-[#171044] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="bg-[#171044] text-white p-8 md:p-12 rounded-3xl shadow-xl border border-white/10 mb-10 print:bg-transparent print:text-black print:p-0 print:border-none print:shadow-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-[#D8F500] uppercase tracking-wider mb-4 print:hidden">
            <Shield size={14} /> Legal &amp; Transparency
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-white print:text-black">
            Privacy Policy <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/80 max-w-2xl print:text-neutral-700">
            How {SITE_CONFIG.ACADEMY_NAME} collects, protects, isolates, and retains personal data across our athletic management platform.
          </p>
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/60 print:text-neutral-500">
            <span>Entity: <strong className="text-white print:text-black">{SITE_CONFIG.LEGAL_ENTITY_NAME}</strong></span>
          </div>
        </header>

        {/* Table of Contents */}
        <nav aria-label="Table of contents" className="bg-white p-6 rounded-2xl border border-[#171044]/10 shadow-sm mb-10 print:hidden">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#171044] mb-3">
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#171044]/80">
            <li><a href="#data-collected" className="hover:text-[#FF5A00] transition-colors">1. Data We Collect</a></li>
            <li><a href="#purposes" className="hover:text-[#FF5A00] transition-colors">2. Purposes of Processing</a></li>
            <li><a href="#access-scoping" className="hover:text-[#FF5A00] transition-colors">3. Role-Based Access Scoping</a></li>
            <li><a href="#minors-guardians" className="hover:text-[#FF5A00] transition-colors">4. Minors &amp; Guardian Consent</a></li>
            <li><a href="#cookies-storage" className="hover:text-[#FF5A00] transition-colors">5. Cookies &amp; Local Storage</a></li>
            <li><a href="#public-data" className="hover:text-[#FF5A00] transition-colors">6. Public Display &amp; Privacy Masking</a></li>
            <li><a href="#sharing-processors" className="hover:text-[#FF5A00] transition-colors">7. Data Sharing &amp; Processors</a></li>
            <li><a href="#retention" className="hover:text-[#FF5A00] transition-colors">8. Data Retention</a></li>
            <li><a href="#security" className="hover:text-[#FF5A00] transition-colors">9. Security Measures</a></li>
            <li><a href="#user-rights" className="hover:text-[#FF5A00] transition-colors">10. User Rights &amp; Requests</a></li>
            <li><a href="#contact" className="hover:text-[#FF5A00] transition-colors">11. Contact Information</a></li>
          </ol>
        </nav>

        {/* Content Body */}
        <div className="space-y-10 text-sm md:text-base leading-relaxed text-[#171044]/90 bg-white p-8 md:p-12 rounded-3xl border border-[#171044]/10 shadow-sm print:shadow-none print:p-0 print:border-none">
          <section id="data-collected" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              1. Data We Collect
            </h2>
            <p className="mb-3">
              We collect information necessary to operate training programs, tournament logistics, development tracking, and platform authentication:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-[#171044]/80">
              <li><strong>Account Credentials:</strong> Full name, email address, cryptographic password hash (passwords are never stored in plaintext), and assigned platform role (Admin, Coach, Athlete, Organizer).</li>
              <li><strong>Athlete Profiles:</strong> Date of birth, contact phone number, team assignment, jersey number, playing position, primary and secondary sports.</li>
              <li><strong>Guardian &amp; Emergency Records:</strong> Guardian name, relationship, contact email, emergency phone numbers, and emergency contact details for athletes.</li>
              <li><strong>Health &amp; Medical Notes:</strong> Allergies, dietary considerations, and emergency medical notes explicitly provided for athlete welfare during sports activities.</li>
              <li><strong>Training &amp; Development:</strong> Session attendance timestamps, drill assessments, coach performance reviews and feedback, athlete development goals, target milestones, and skill progression averages.</li>
              <li><strong>Tournaments &amp; Competition:</strong> Team roster registrations, squad listings, match minutes, goals, assists, yellow/red cards, substitutions, and match results.</li>
              <li><strong>Communications:</strong> Public contact-form inquiries, broadcast announcements, activity notifications, and support messages.</li>
              <li><strong>Chatbot Inquiries:</strong> Interactive AI assistant conversational messages and prompt history (retained for 30 days before automated purge).</li>
              <li><strong>Audit Records:</strong> Security event logs including administrative role updates, password changes, and access timestamps.</li>
            </ul>
          </section>

          <section id="purposes" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              2. Purposes of Processing
            </h2>
            <p>
              We process personal data solely for genuine athletic and administrative purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-[#171044]/80 mt-2">
              <li>Facilitating academy registration, roster placement, and role authorization.</li>
              <li>Coordinating team training sessions, tracking attendance, and evaluating skill development.</li>
              <li>Organizing tournament brackets, fixtures, match officiating, and scorekeeping.</li>
              <li>Safeguarding athlete health through restricted emergency contacts and medical alert notices.</li>
              <li>Delivering essential transactional communications, password recovery links, and service alerts.</li>
            </ul>
          </section>

          <section id="access-scoping" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              3. Role-Based Access Scoping
            </h2>
            <p className="mb-2">
              Our backend enforces strict multi-tenant authorization boundaries:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-[#171044]/80">
              <li><strong>Coaches:</strong> Access is restricted strictly to athletes rostered on their own assigned teams. Coaches cannot inspect records of teams they do not oversee.</li>
              <li><strong>Medical Notes:</strong> Sensitive medical notes and emergency files are restricted to Academy Administrators. Coaches receive actionable safeguarding indicators only where permitted.</li>
              <li><strong>Athletes:</strong> Can access only their own individual development metrics, attendance logs, and squad announcements.</li>
              <li><strong>Organizers &amp; Administrators:</strong> Manage tournament fixtures, referee assignments, scores, and event timestamps without exposing athlete personal contact information.</li>
            </ul>
          </section>

          <section id="minors-guardians" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              4. Minors &amp; Guardian Consent
            </h2>
            <p>
              Because our athletic academy trains youth athletes, any account registration for a minor requires verified parent or legal guardian details. Parents or legal guardians hold the right to review their child's profile, request corrections to medical or emergency information, and request account deactivation.
            </p>
          </section>

          <section id="cookies-storage" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              5. Cookies &amp; Local Storage
            </h2>
            <p className="mb-2">
              We respect your privacy and practice minimal data retention on your device:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-[#171044]/80">
              <li><strong>Session Cookie:</strong> Exactly one secure, <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">httpOnly</code> cookie named <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">athletiq_refresh</code> used exclusively to renew authentication tokens securely without JavaScript exposure.</li>
              <li><strong>Local Storage:</strong> Exactly one non-sensitive client flag, <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">athletiq_has_session</code>, used to reduce unnecessary token refresh requests upon initial page load.</li>
              <li><strong>Zero Ad Trackers:</strong> We do not load third-party advertising trackers, cross-site behavioral cookies, or commercial analytics scripts.</li>
            </ul>
          </section>

          <section id="public-data" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              6. Public Display &amp; Privacy Masking
            </h2>
            <p>
              On publicly accessible match summaries, live event scoreboards, and tournament standings, player identities are systematically privacy-masked as &ldquo;FirstName L.&rdquo; (first name plus last initial). Contact information, date of birth, guardian phone numbers, and private medical notes are strictly stripped from all public API responses.
            </p>
          </section>

          <section id="sharing-processors" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              7. Data Sharing &amp; Processors
            </h2>
            <p>
              We <strong>never sell, lease, or monetize</strong> personal athlete or guardian data. Data is shared exclusively with technical infrastructure providers operating as data processors under confidentiality agreements:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-[#171044]/80 mt-2">
              <li>Cloud application hosting and web serving infrastructure.</li>
              <li>Managed database hosting providers for secure encrypted persistence.</li>
              <li>Transactional SMTP email delivery services (for password reset and operational notifications).</li>
            </ul>
          </section>

          <section id="retention" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              8. Data Retention
            </h2>
            <p>
              Athlete records, attendance histories, and competition statistics are maintained for the duration of the athlete&rsquo;s active enrollment in {SITE_CONFIG.ACADEMY_NAME}. Chatbot assistant conversation transcripts are automatically retained for 30 days and purged. Operational audit logs are retained for security auditing. Upon request or program departure, records are archived or permanently expunged in accordance with administrative requirements.
            </p>
          </section>

          <section id="security" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              9. Security Measures
            </h2>
            <p>
              We apply defense-in-depth protection: TLS encryption in transit, Argon2/Bcrypt cryptographic password hashing, short-lived JWT access tokens stored in memory, rate limiting against brute-force attacks, and server-side Zod payload sanitization to prevent injection vulnerabilities.
            </p>
          </section>

          <section id="user-rights" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              10. User Rights &amp; Requests
            </h2>
            <p>
              You or your legal guardian may request access to your personal information, request correction of inaccurate profile data, or request deletion of account records by contacting our administrative team at{' '}
              <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="text-[#FF5A00] font-bold underline hover:text-[#e04f00]">
                {SITE_CONFIG.CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section id="contact" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              11. Contact Information
            </h2>
            <p className="mb-2">
              For any questions regarding this Privacy Policy or data protection practices, please contact:
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

export default PrivacyPolicyPage;
