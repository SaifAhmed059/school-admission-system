import React from 'react';
import { UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StudentIdBarProps {
  studentId: string;
  setStudentId: (id: string) => void;
}

export const StudentIdBar: React.FC<StudentIdBarProps> = ({ studentId, setStudentId }) => {
  const digitsOnly = studentId.replace(/\D/g, '');
  const isValid = digitsOnly.length === 17;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 17);
    setStudentId(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              শিক্ষার্থীর পরিচয় (জন্ম নিবন্ধন নম্বর)
            </h2>
            <p className="text-xs text-slate-500">
              ভর্তি আবেদন ও ফি জমা দেওয়ার জন্য ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              inputMode="numeric"
              placeholder="১৭ অঙ্কের জন্ম নিবন্ধন নম্বর"
              value={studentId}
              onChange={handleChange}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono tracking-wider transition-all focus:outline-none focus:ring-2 ${
                isValid
                  ? 'border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:ring-emerald-500/20'
                  : digitsOnly.length > 0
                  ? 'border-amber-400 bg-amber-50/20 text-slate-800 focus:ring-amber-500/20'
                  : 'border-slate-300 text-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            <div className="absolute right-3 top-2.5">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : digitsOnly.length > 0 ? (
                <span className="text-xs font-semibold text-amber-600">
                  {digitsOnly.length}/17
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-xs flex items-center gap-1">
            {isValid ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                ✓ জন্ম নিবন্ধন নম্বর সম্পন্ন হয়েছে
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {digitsOnly.length === 0
                  ? 'আবেদন করতে নম্বরটি দেওয়া বাধ্যতামূলক'
                  : `আর ${17 - digitsOnly.length} টি অঙ্ক বাকি`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
