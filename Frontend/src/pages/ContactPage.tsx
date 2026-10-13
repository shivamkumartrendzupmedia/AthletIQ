import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CrossAccent, AthleticBadge } from '../design-system';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { academyApi, mapFieldErrors } from '../services/academyApi';
import { ApiClientError } from '../lib/apiClient';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    try {
      const res = await academyApi.submitContactMessage({
        name: formData.name,
        email: formData.email,
        subject: formData.subject.trim() ? formData.subject.trim() : undefined,
        message: formData.message,
      });

      setSuccessMessage(
        res.message || 'Thank you for reaching out to ATHLETIQ. An academy representative will respond within 24 hours.'
      );
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 429) {
          setErrorBanner('Too many contact requests from this IP. Please wait an hour before submitting another message.');
        } else {
          const fe = mapFieldErrors(err);
          if (Object.keys(fe).length > 0) {
            setFieldErrors(fe);
          } else {
            setErrorBanner(err.message || 'Failed to submit contact message.');
          }
        }
      } else {
        setErrorBanner(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setErrorBanner(null);
    setFieldErrors({});
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">GET IN TOUCH</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">
            CONTACT ATHLETIQ <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Have questions about program enrollment, trial assessments, or hosting a tournament? Connect with us.
          </p>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Contact Details Left */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-black font-display text-[#171044] uppercase tracking-tight">
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
            <Card variant="dark" className="p-8 md:p-12 shadow-2xl relative overflow-hidden bg-[#171044] text-white">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#D8F500] text-[#171044] mx-auto flex items-center justify-center font-bold shadow-lg">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-3xl font-black font-display text-white uppercase tracking-tight">
                    MESSAGE SENT!
                  </h3>
                  <p className="text-white/80 text-sm max-w-md mx-auto">
                    {successMessage}
                  </p>
                  <Button variant="lime" onClick={handleReset} className="mt-4">
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {errorBanner && (
                    <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center gap-3 text-red-200 text-xs font-semibold">
                      <AlertCircle size={18} className="text-red-400 shrink-0" />
                      <span>{errorBanner}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Your Name <span className="text-[#FF5A00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm"
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-[#FF5A00] font-bold mt-1.5">
                        name: {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Your Email <span className="text-[#FF5A00]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm"
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-[#FF5A00] font-bold mt-1.5">
                        email: {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Subject (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Inquiry topic or program interest"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm"
                    />
                    {fieldErrors.subject && (
                      <p className="text-xs text-[#FF5A00] font-bold mt-1.5">
                        subject: {fieldErrors.subject}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                      Message <span className="text-[#FF5A00]">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-[#D8F500] text-sm resize-none"
                    />
                    {fieldErrors.message && (
                      <p className="text-xs text-[#FF5A00] font-bold mt-1.5">
                        message: {fieldErrors.message}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={isSubmitting}
                    iconRight={isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
                  </Button>

                  <p className="text-[11px] text-white/60 text-center leading-relaxed mt-2">
                    By submitting this form, you acknowledge that your information will be processed in accordance with our{' '}
                    <Link to="/privacy" className="text-[#D8F500] underline hover:text-white">
                      Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link to="/terms" className="text-[#D8F500] underline hover:text-white">
                      Terms of Service
                    </Link>
                    .
                  </p>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
