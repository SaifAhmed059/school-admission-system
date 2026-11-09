import React from 'react';
import { School, Users, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { ClassItem, HoldItem } from '../types';

interface ClassListProps {
  classes: ClassItem[];
  studentId: string;
  activeHolds: HoldItem[];
  onApply: (classId: string) => Promise<void>;
  applyingClassId: string | null;
  isLoading: boolean;
}

export const ClassList: React.FC<ClassListProps> = ({
  classes,
  studentId,
  activeHolds,
  onApply,
  applyingClassId,
  isLoading
}) => {
  const isStudentIdValid = studentId.replace(/\D/g, '').length === 17;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-600" />
            উপলব্ধ ক্লাস ও শিফট তালিকা
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            আগে আবেদন করলে আগে পাবেন ভিত্তিতে সরাসরি ভর্তি (রিয়েলটাইম আপডেট)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          রিয়েলটাইম আসন গণনা চালু আছে
        </div>
      </div>

      {isLoading && classes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          ক্লাস তালিকা লোড হচ্ছে...
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">কোনো ক্লাস পাওয়া যায়নি।</p>
          <p className="text-xs text-slate-400 mt-1">নিচের অ্যাডমিন প্যানেল থেকে নতুন ক্লাস তৈরি করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => {
            const hasExistingHoldOrConfirm = activeHolds.some(
              (h) => h.classId === cls.id && (h.status === 'CONFIRMED' || h.status === 'HELD')
            );
            const isFull = cls.availableSeats <= 0;
            const isApplying = applyingClassId === cls.id;
            const occupancyPercent = cls.totalSeats > 0 
              ? Math.min(100, Math.round(((cls.totalSeats - cls.availableSeats) / cls.totalSeats) * 100))
              : 0;

            return (
              <div
                key={cls.id}
                className={`flex flex-col justify-between rounded-xl p-5 border transition-all ${
                  isFull
                    ? 'bg-slate-50/70 border-slate-200 opacity-90'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                      {cls.name}
                    </h3>
                    {isFull ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                        সিট পূর্ণ
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cls.availableSeats} টি খালি
                      </span>
                    )}
                  </div>

                  {/* Seat stats grid */}
                  <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        মোট আসন
                      </div>
                      <div className="text-sm font-bold text-slate-800 mt-1">{cls.totalSeats}</div>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        নিশ্চিত
                      </div>
                      <div className="text-sm font-bold text-emerald-800 mt-1">{cls.confirmedSeats}</div>
                    </div>

                    <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                      <div className="text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        হোল্ডে আছে
                      </div>
                      <div className="text-sm font-bold text-amber-800 mt-1">{cls.heldSeats}</div>
                    </div>

                    <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <div className="text-indigo-700 flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        অবশিষ্ট খালি
                      </div>
                      <div className="text-sm font-bold text-indigo-800 mt-1">{cls.availableSeats}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>পূর্ণতা</span>
                      <span>{occupancyPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          occupancyPercent >= 100
                            ? 'bg-rose-500'
                            : occupancyPercent > 75
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onApply(cls.id)}
                    disabled={
                      !isStudentIdValid ||
                      isFull ||
                      hasExistingHoldOrConfirm ||
                      isApplying
                    }
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      hasExistingHoldOrConfirm
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : isFull
                        ? 'bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200'
                        : !isStudentIdValid
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-sm hover:shadow'
                    }`}
                  >
                    {isApplying ? (
                      'বুকিং হচ্ছে...'
                    ) : hasExistingHoldOrConfirm ? (
                      'আবেদন করা হয়েছে'
                    ) : isFull ? (
                      'আসন খালি নেই'
                    ) : !isStudentIdValid ? (
                      'উপরে জন্ম নিবন্ধন দিন'
                    ) : (
                      <>
                        আবেদন করুন
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {!isStudentIdValid && !isFull && !hasExistingHoldOrConfirm && (
                    <div className="text-[11px] text-amber-600 mt-1.5 text-center flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      আগে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
