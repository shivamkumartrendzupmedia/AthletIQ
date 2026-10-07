import React, { useState } from 'react';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">GET IN TOUCH</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            CONTACT ATHLETIQ <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Have questions about program enrollment, trial assessments, or hosting a tournament? Connect with us.
          </p>
        </div>
      </section>

      {/* Main Contact Section (Reference Card Matching) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Contact Details Left */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-black font-display text-[#171044]">
                Contact Us <CrossAccent color="orange" size="md" />
              </h2>
              <p className="text-base text-[#171044]/80 font-medium">
                We'd love to hear from you! Fill out the form or reach out via phone or email.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-[#171044]/10 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center font-bold shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <div className="text-xs text-[#171044]/60 uppercase tracking-wider font-bold">Phone Number</div>
                  <div className="font-display font-black text-lg text-[#171044]">+1 (506) 123-4567</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-[#171044]/10 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#4B2A9B]/10 text-[#4B2A9B] flex items-center justify-center font-bold shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <div className="text-xs text-[#171044]/60 uppercase tracking-wider font-bold">Email Address</div>
                  <div className="font-display font-black text-lg text-[#171044]">info@athletiq.com</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-[#171044]/10 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#D8F500]/30 text-[#171044] flex items-center justify-center font-bold shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="text-xs text-[#171044]/60 uppercase tracking-wider font-bold">Academy Complex Location</div>
                  <div className="font-display font-black text-base text-[#171044]">125 Sports Way, Moncton, NB, Canada</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form Card Right */}
          <div className="lg:col-span-7">
            <Card variant="dark" className="p-8 md:p-12 shadow-2xl relative overflow-hidden">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#D8F500] text-[#171044] mx-auto flex items-center justify-center font-bold">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-3xl font-black font-display text-white">MESSAGE SENT!</h3>
                  <p className="text-white/80 text-sm max-w-md mx-auto">
                    Thank you for reaching out to ATHLETIQ. An academy representative will respond to your email within 24 hours.
                  </p>
                  <Button variant="lime" onClick={() => setSubmitted(false)} className="mt-4">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Your Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm resize-none"
                    />
                  </div>

                  <Button variant="primary" fullWidth size="lg" iconRight={<Send size={18} />}>
                    Send Message
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
