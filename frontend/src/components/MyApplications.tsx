import React from 'react';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Printer } from 'lucide-react';
import { HoldItem } from '../types';

interface MyApplicationsProps {
  holds: HoldItem[];
  studentId: string;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onViewReceipt?: (hold: HoldItem) => void;
}

export const MyApplications: React.FC<MyApplicationsProps> = ({
  holds,
  studentId,
  onRefresh,
  isRefreshing,
  onViewReceipt
}) => {
  const isStudentIdValid = studentId.replace(/\D/g, '').length === 17;

  if (!isStudentIdValid) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">আপনার আবেদন দেখতে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            আমার আবেদনসমূহ
          </h2>
          <p className="text-xs text-slate-500">
            শিক্ষার্থী ({studentId})-এর সকল আবেদনের বর্তমান অবস্থা
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </button>
      </div>

      {holds.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">এই শিক্ষার্থীর কোনো আবেদন পাওয়া যায়নি।</p>
          <p className="text-xs text-slate-400 mt-1">উপরের তালিকা থেকে যেকোনো ক্লাসে আবেদন করতে পারেন।</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">ক্লাস ও শিফট</th>
                <th className="py-3 px-3">আবেদন আইডি</th>
                <th className="py-3 px-3">অবস্থা</th>
                <th className="py-3 px-3">মেয়াদ / তারিখ</th>
                <th className="py-3 px-3 text-right">রশিদ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holds.map((hold) => {
                const isPast = new Date(hold.expiresAt).getTime() <= Date.now();
                const effectiveStatus = (isPast && hold.status === 'HELD') ? 'EXPIRED' : hold.status;

                return (
                  <tr key={hold.holdId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {hold.className || hold.classId}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-500">
                      {hold.holdId}
                    </td>
                    <td className="py-3.5 px-3">
                      {effectiveStatus === 'HELD' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-500" />
                          বুকিংকৃত (HELD)
                        </span>
                      )}
                      {effectiveStatus === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ভর্তি নিশ্চিত (CONFIRMED)
                        </span>
                      )}
                      {effectiveStatus === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          মেয়াদোত্তীর্ণ (EXPIRED)
                        </span>
                      )}
                      {effectiveStatus === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          বাতিল (CANCELLED)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500">
                      {new Date(hold.expiresAt).toLocaleString('bn-BD', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {effectiveStatus === 'CONFIRMED' && onViewReceipt ? (
                        <button
                          type="button"
                          onClick={() => onViewReceipt(hold)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          রশিদ
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
