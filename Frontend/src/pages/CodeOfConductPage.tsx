import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../lib/siteConfig';
import { LEGAL_LINKS } from '../lib/legalLinks';
import { CrossAccent } from '../design-system';
import { Award, ArrowLeft } from 'lucide-react';

export const CodeOfConductPage: React.FC = () => {
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
            {LEGAL_LINKS.filter((l) => l.path !== '/code-of-conduct').map((l) => (
              <Link key={l.path} to={l.path} className="text-[#171044]/60 hover:text-[#171044] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Header */}
        <header className="bg-[#171044] text-white p-8 md:p-12 rounded-3xl shadow-xl border border-white/10 mb-10 print:bg-transparent print:text-black print:p-0 print:border-none print:shadow-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-[#D8F500] uppercase tracking-wider mb-4 print:hidden">
            <Award size={14} /> Athletic Standards &amp; Safeguarding
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-white print:text-black">
            Code of Conduct <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="mt-3 text-sm md:text-base text-white/80 max-w-2xl print:text-neutral-700">
            Standards of integrity, sportsmanship, safeguarding, and professional conduct across the {SITE_CONFIG.ACADEMY_NAME} community.
          </p>
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs text-white/60 print:text-neutral-500">
            <span>Effective Date: <strong className="text-white print:text-black">{SITE_CONFIG.EFFECTIVE_DATE}</strong></span>
            <span>Last Updated: <strong className="text-white print:text-black">{SITE_CONFIG.LAST_UPDATED}</strong></span>
            <span>Academy: <strong className="text-white print:text-black">{SITE_CONFIG.ACADEMY_NAME}</strong></span>
          </div>
        </header>

        {/* Table of Contents */}
        <nav aria-label="Table of contents" className="bg-white p-6 rounded-2xl border border-[#171044]/10 shadow-sm mb-10 print:hidden">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#171044] mb-3">
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#171044]/80">
            <li><a href="#respect-fairplay" className="hover:text-[#FF5A00] transition-colors">1. Respect &amp; Fair Play</a></li>
            <li><a href="#anti-harassment" className="hover:text-[#FF5A00] transition-colors">2. Anti-Harassment &amp; Bullying</a></li>
            <li><a href="#safeguarding" className="hover:text-[#FF5A00] transition-colors">3. Safeguarding of Minors</a></li>
            <li><a href="#health-safety" className="hover:text-[#FF5A00] transition-colors">4. Health, Safety &amp; Injury Reporting</a></li>
            <li><a href="#integrity" className="hover:text-[#FF5A00] transition-colors">5. Competition Integrity</a></li>
            <li><a href="#attendance" className="hover:text-[#FF5A00] transition-colors">6. Attendance &amp; Commitment</a></li>
            <li><a href="#platform-use" className="hover:text-[#FF5A00] transition-colors">7. Platform Ethics &amp; Account Security</a></li>
            <li><a href="#social-media" className="hover:text-[#FF5A00] transition-colors">8. Media &amp; Public Communications</a></li>
            <li><a href="#consequences" className="hover:text-[#FF5A00] transition-colors">9. Disciplinary Actions &amp; Consequences</a></li>
            <li><a href="#reporting" className="hover:text-[#FF5A00] transition-colors">10. How to Report a Violation</a></li>
          </ol>
        </nav>

        {/* Content Body */}
        <div className="space-y-10 text-sm md:text-base leading-relaxed text-[#171044]/90 bg-white p-8 md:p-12 rounded-3xl border border-[#171044]/10 shadow-sm print:shadow-none print:p-0 print:border-none">
          <section id="respect-fairplay" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              1. Respect &amp; Fair Play
            </h2>
            <p>
              Every participant—athletes, coaches, referees, tournament organizers, and guardians—must uphold the highest principles of fair play. Show mutual respect on and off the field, accept referee decisions with composure, and encourage teammates unconditionally.
            </p>
          </section>

          <section id="anti-harassment" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              2. Anti-Harassment &amp; Bullying
            </h2>
            <p>
              {SITE_CONFIG.ACADEMY_NAME} enforces a strict zero-tolerance policy toward any form of harassment, discrimination, verbal hostility, physical intimidation, hazing, or cyberbullying. Any derogatory remarks based on race, gender, nationality, religion, disability, or orientation will result in immediate disciplinary suspension.
            </p>
          </section>

          <section id="safeguarding" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              3. Safeguarding of Minors
            </h2>
            <p className="mb-2">
              The physical and psychological safety of youth athletes is paramount:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm text-[#171044]/80">
              <li><strong>Zero Private Channels:</strong> Staff, coaches, and adult officials are strictly prohibited from maintaining private, unmonitored one-to-one electronic communications with minor athletes outside official academy channels. All digital communications must include parents or official group channels.</li>
              <li><strong>Media &amp; Photography Consent:</strong> Team photography and video recordings taken during training sessions or tournament fixtures require parental consent. Media must never be used or published inappropriately.</li>
            </ul>
          </section>

          <section id="health-safety" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              4. Health, Safety &amp; Injury Reporting
            </h2>
            <p>
              Athletes and coaches must immediately report injuries, concussions, extreme fatigue, or discomfort to designated medical personnel and academy leadership. Athletes must not play through head injuries or conceal medical symptoms.
            </p>
          </section>

          <section id="integrity" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              5. Competition Integrity
            </h2>
            <p>
              All tournaments, matches, and competitive fixtures must be conducted with absolute integrity:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-[#171044]/80 mt-2">
              <li>No match-fixing, collusive score manipulation, or intentional underperformance.</li>
              <li>Strict prohibition of betting or wagering by academy staff, coaches, officials, or athletes on any academy match or tournament fixture.</li>
              <li>Match officials must maintain complete impartiality and disclose any conflict of interest before accepting fixture assignments.</li>
            </ul>
          </section>

          <section id="attendance" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              6. Attendance &amp; Commitment
            </h2>
            <p>
              Athletes and coaches must arrive promptly for scheduled training drills and tournament matches. Planned absences should be communicated to team coaches in advance through platform attendance features.
            </p>
          </section>

          <section id="platform-use" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              7. Platform Ethics &amp; Account Security
            </h2>
            <p>
              Users must not share login credentials, access other users' accounts, or exploit platform capabilities to view unauthorized athlete medical records or private contacts. Attempting to tamper with live score updates or evaluation records is strictly prohibited.
            </p>
          </section>

          <section id="social-media" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              8. Media &amp; Public Communications
            </h2>
            <p>
              When discussing {SITE_CONFIG.ACADEMY_NAME}, teammates, coaches, or opponents on public social media, members must exhibit sportsmanship and refrain from posting disparaging, inflammatory, or confidential comments.
            </p>
          </section>

          <section id="consequences" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              9. Disciplinary Actions &amp; Consequences
            </h2>
            <p>
              Violations of this Code of Conduct will be investigated by academy leadership and may result in:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm text-[#171044]/80 mt-2">
              <li>Formal warning and corrective counseling.</li>
              <li>Temporary suspension from training sessions or tournament matches.</li>
              <li>Revocation of coaching credentials or official assignments.</li>
              <li>Permanent expulsion from the academy and platform termination.</li>
            </ul>
          </section>

          <section id="reporting" className="scroll-mt-6">
            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-[#171044] mb-3">
              10. How to Report a Violation
            </h2>
            <p className="mb-3">
              If you observe or experience conduct that violates these standards, or have safeguarding concerns regarding a youth athlete, please contact our safeguarding and compliance team immediately:
            </p>
            <div className="bg-[#171044]/5 p-4 rounded-xl border border-[#171044]/10 text-xs md:text-sm space-y-1">
              <div><strong>Academy Safeguarding:</strong> {SITE_CONFIG.ACADEMY_NAME} Compliance</div>
              <div><strong>Confidential Email:</strong> <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="text-[#FF5A00] font-bold">{SITE_CONFIG.CONTACT_EMAIL}</a></div>
              <div><strong>Mailing Address:</strong> {SITE_CONFIG.CONTACT_ADDRESS}</div>
            </div>
            <p className="mt-3 text-xs text-[#171044]/70">
              All reports are handled with confidentiality, urgency, and protection against retaliation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CodeOfConductPage;
