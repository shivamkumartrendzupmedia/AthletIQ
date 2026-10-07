import React from 'react';
import { newsData } from '../data/newsData';
import { Button, Card, SectionHeader, CrossAccent, AthleticBadge } from '../design-system';
import { ArrowRight, Clock, Calendar, User } from 'lucide-react';

export const NewsPage: React.FC = () => {
  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="bg-[#171044] text-white py-16 md:py-20 rounded-b-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <AthleticBadge variant="lime">ACADEMY NEWS & UPDATES</AthleticBadge>
          <h1 className="text-4xl md:text-6xl font-black font-display">
            NEWS & ANNOUNCEMENTS <CrossAccent color="orange" size="lg" />
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Stay updated with match reports, scouting news, biometrics tech rollouts, and tournament schedules.
          </p>
        </div>
      </section>

      {/* News Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {newsData.map((article) => (
            <Card key={article.id} variant="standard" padding="none" className="group overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-64 relative overflow-hidden">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <AthleticBadge variant="purple">{article.category}</AthleticBadge>
                  </div>
                </div>

                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-4 text-xs font-semibold text-[#171044]/60">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {article.date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {article.readTime}</span>
                  </div>

                  <h2 className="text-2xl font-bold font-display text-[#171044] group-hover:text-[#FF5A00] transition-colors leading-snug">
                    {article.title}
                  </h2>

                  <p className="text-sm text-[#171044]/80 leading-relaxed font-medium">{article.summary}</p>
                </div>
              </div>

              <div className="p-8 pt-0 border-t border-[#171044]/10 flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-[#171044]/70">By {article.author}</span>
                <Button variant="primary" size="sm" iconRight={<ArrowRight size={14} />}>
                  Read Article
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
