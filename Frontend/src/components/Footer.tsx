import React from 'react';
import { Link } from 'react-router-dom';
import { CrossAccent, Button } from '../design-system';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

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
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img
                src="/logo-white.png"
                alt="ATHLETIQ"
                className="h-10 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <CrossAccent color="orange" size="md" />
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              The ultimate Sports Academy & Tournament Management Platform connecting athlete development, elite training, match performance, and live competition.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FF5A00] flex items-center justify-center transition-colors text-white">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FF5A00] flex items-center justify-center transition-colors text-white">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FF5A00] flex items-center justify-center transition-colors text-white">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Explore Platform</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/about" className="hover:text-white transition-colors">About Academy</Link></li>
              <li><Link to="/programs" className="hover:text-white transition-colors">Sports & Programs</Link></li>
              <li><Link to="/coaches" className="hover:text-white transition-colors">Coaches Roster</Link></li>
              <li><Link to="/teams" className="hover:text-white transition-colors">Academy Teams</Link></li>
              <li><Link to="/achievements" className="hover:text-white transition-colors">Achievements & Cabinet</Link></li>
            </ul>
          </div>

          {/* Competitions */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Competitions</h4>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/tournaments" className="hover:text-white transition-colors">All Tournaments</Link></li>
              <li><Link to="/tournaments/active-nb-cup-2026" className="hover:text-white transition-colors">Active NB Cup 2026</Link></li>
              <li><Link to="/gallery" className="hover:text-white transition-colors">Photo & Media Gallery</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News & Announcements</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Academy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-lg text-[#D8F500]">Contact Us</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#FF5A00] shrink-0 mt-0.5" />
                <span>125 Sports Way, Moncton, NB, Canada</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#FF5A00] shrink-0" />
                <span>+1 (506) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#FF5A00] shrink-0" />
                <span>info@athletiq.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-white/60 gap-4">
          <p>© {new Date().getFullYear()} ATHLETIQ Platform Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Code of Conduct</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
