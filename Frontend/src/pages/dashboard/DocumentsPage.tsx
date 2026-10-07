import React from 'react';
import { Card, CrossAccent, AthleticBadge, Button } from '../../design-system';
import { FileText, Upload, CheckCircle2, Clock } from 'lucide-react';
import { mockDocuments } from '../../data/academyData';

export const DocumentsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <AthleticBadge variant="purple">ACADEMY COMPLIANCE & DOCUMENTS</AthleticBadge>
          <h1 className="text-3xl md:text-4xl font-black font-display text-[#171044] mt-2">
            DOCUMENTS & MEDICAL WAIVERS <CrossAccent color="orange" size="md" />
          </h1>
        </div>

        <Button variant="primary" iconLeft={<Upload size={18} />}>
          Upload Document
        </Button>
      </div>

      <Card variant="standard" className="p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#171044] text-white text-xs font-extrabold uppercase font-display border-b border-white/10">
              <th className="p-4 pl-6">Document Title</th>
              <th className="p-4">Category</th>
              <th className="p-4">Athlete Name</th>
              <th className="p-4">Uploaded Date</th>
              <th className="p-4 pr-6">Clearance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171044]/10 text-sm font-semibold">
            {mockDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#F7F1E8]/50 transition-colors">
                <td className="p-4 pl-6 flex items-center gap-3">
                  <FileText size={20} className="text-[#FF5A00]" />
                  <span className="font-bold text-[#171044]">{doc.title}</span>
                </td>
                <td className="p-4">
                  <AthleticBadge variant="purple" size="sm">{doc.category}</AthleticBadge>
                </td>
                <td className="p-4 text-[#171044]">{doc.athleteName}</td>
                <td className="p-4 text-xs text-[#171044]/70">{doc.uploadedDate}</td>
                <td className="p-4 pr-6">
                  {doc.status === 'Verified' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                      <CheckCircle2 size={14} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
                      <Clock size={14} /> Pending Review
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
