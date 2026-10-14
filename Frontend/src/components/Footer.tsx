import React from 'react';
import { Link } from 'react-router-dom';
import { CrossAccent, Button } from '../design-system';
import { Mail, MapPin, ArrowRight } from 'lucide-react';

import { LEGAL_LINKS } from '../lib/legalLinks';
import { SITE_CONFIG } from '../lib/siteConfig';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#171044] text-white pt-20 pb-12 border-t border-white/10 relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#4B2A9B]/30 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        {/* Newsletter Callout Banner */}
        <div className="bg-gradient-to-r from-[#4B2A9B] to-[#171044] p-8 md:p-12 rounded-3xl border border-white/15 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h3 className="text-2xl md:text-4xl font-black font-display text-white">
              STAY IN THE ACADEMY GAME <CrossAccent color="lime" size="md" />
            </h3>
            <p className="text-white/80 mt-2 text-sm md:text-base">
              Subscribe to get official tournament fixtures, trials updates, and athlete scout reports delivered weekly.
            </p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex w-full lg:w-auto gap-3">
            <input
              type="email"
              placeholder="Enter your email address"
              className="bg-white/10 text-white placeholder-white/50 px-5 py-3.5 rounded-full text-sm outline-none border border-white/20 focus:border-[#D8F500] w-full lg:w-80"
              required
            />
            <Button variant="lime" size="md" iconRight={<ArrowRight size={18} />}>
              Subscribe
            </Button>
          </form>
        </div>

        {/* Core Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-1 space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img
                src="/logo-white.png"
                alt={SITE_CONFIG.ACADEMY_NAME}
                className="h-10 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <CrossAccent color="orange" size="md" />
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              The ultimate Sports Academy &amp; Tournament Management Platform connecting athlete development, elite training, and live competition.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Explore Platform</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/about" className="hover:text-white transition-colors">About Academy</Link></li>
              <li><Link to="/programs" className="hover:text-white transition-colors">Sports &amp; Programs</Link></li>
              <li><Link to="/coaches" className="hover:text-white transition-colors">Coaches Roster</Link></li>
              <li><Link to="/teams" className="hover:text-white transition-colors">Academy Teams</Link></li>
              <li><Link to="/achievements" className="hover:text-white transition-colors">Achievements</Link></li>
            </ul>
          </div>

          {/* Competitions */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Competitions</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/tournaments" className="hover:text-white transition-colors">All Tournaments</Link></li>
              <li><Link to="/matches/live" className="hover:text-white transition-colors">Live Match Center</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Academy</Link></li>
            </ul>
          </div>

          {/* Legal Group */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Legal &amp; Policy</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              {LEGAL_LINKS.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Contact Us</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#FF5A00] shrink-0 mt-0.5" />
                <span>{SITE_CONFIG.CONTACT_ADDRESS}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#FF5A00] shrink-0" />
                <a href={`mailto:${SITE_CONFIG.CONTACT_EMAIL}`} className="hover:text-white transition-colors">
                  {SITE_CONFIG.CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-white/60 gap-4">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.LEGAL_ENTITY_NAME}. All rights reserved.</p>
          <div className="flex gap-6">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.path} to={link.path} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
