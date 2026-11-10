import React from 'react';
import { CheckCircle2, Printer, X, School, Calendar, Hash, User } from 'lucide-react';
import { HoldItem } from '../types';

interface AdmissionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  hold: HoldItem | null;
  studentId: string;
}

export const AdmissionReceiptModal: React.FC<AdmissionReceiptModalProps> = ({
  isOpen,
  onClose,
  hold,
  studentId
}) => {
  if (!isOpen || !hold) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 print:hidden">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ভর্তি নিশ্চিতকরণ রশিদ (Admission Confirmation Slip)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0" id="admission-slip">
          {/* Institutional Header */}
          <div className="text-center pb-6 border-b border-slate-200">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-3">
              <School className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              অনলাইন বেসরকারি স্কুল ভর্তি সিস্টেম
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              অনলাইন ভর্তি নিশ্চায়ন ও ফি প্রাপ্তি রশিদ — শিক্ষাবর্ষ ২০২৬-২০২৭
            </p>
            <div className="inline-block mt-3 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
              ভর্তি নিশ্চিতকৃত (ADMISSION CONFIRMED)
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-sm">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                শিক্ষার্থীর জন্ম নিবন্ধন নম্বর:
              </span>
              <span className="font-mono font-bold text-slate-800">{studentId}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 text-xs flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-400" />
                শ্রেণি ও শিফট:
              </span>
              <span className="font-bold text-slate-900">
                {hold.className || hold.classId}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 text-xs flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                আবেদন / ট্রানজ্যাকশন আইডি:
              </span>
              <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold">
                {hold.holdId}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                নিশ্চিতকরণের সময় ও তারিখ:
              </span>
              <span className="text-xs text-slate-700 font-medium">
                {new Date().toLocaleString('bn-BD', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 text-xs">ভর্তি ফি স্ট্যাটাস:</span>
              <span className="text-xs font-bold text-emerald-700">পরিশোধিত (PAID)</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
            <strong>নির্দেশনা:</strong> এটি একটি ডিজিটাল নিশ্চয়তা পত্র। স্কুল খোলার পর মূল জন্ম নিবন্ধন সনদপত্র ও এই রশিদের কপি নিয়ে স্কুলে যোগাযোগ করতে হবে।
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            রশিদ প্রিন্ট / PDF সংরক্ষণ
          </button>
        </div>
      </div>
    </div>
  );
};
