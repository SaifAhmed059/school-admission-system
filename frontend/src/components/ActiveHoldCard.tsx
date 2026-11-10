import React, { useState, useEffect } from 'react';
import { Timer, CheckCircle, XCircle, CreditCard, Clock, School, Printer } from 'lucide-react';
import { HoldItem } from '../types';

interface ActiveHoldCardProps {
  hold: HoldItem;
  onConfirm: (holdId: string) => Promise<void>;
  onCancel: (holdId: string) => Promise<void>;
  onViewReceipt?: (hold: HoldItem) => void;
  isProcessing: boolean;
}

export const ActiveHoldCard: React.FC<ActiveHoldCardProps> = ({
  hold,
  onConfirm,
  onCancel,
  onViewReceipt,
  isProcessing
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const diff = Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const [isLocalExpired, setIsLocalExpired] = useState<boolean>(() => {
    return new Date(hold.expiresAt).getTime() <= Date.now() || hold.status === 'EXPIRED';
  });

  useEffect(() => {
    const calculateRemaining = () => {
      const diff = Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsRemaining(0);
        setIsLocalExpired(true);
      } else {
        setSecondsRemaining(diff);
        setIsLocalExpired(false);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [hold.expiresAt]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const effectiveStatus = (isLocalExpired && hold.status === 'HELD') ? 'EXPIRED' : hold.status;

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl mb-8 border border-indigo-700/40 relative overflow-hidden">
      {/* Background ambient decoration */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-700/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-indigo-300 font-medium">
                চলমান আবেদন (বুকিংকৃত আসন)
              </div>
              <h3 className="text-xl font-bold text-white">
                {hold.className || `ক্লাস আইডি: ${hold.classId}`}
              </h3>
            </div>
          </div>

          <div>
            {effectiveStatus === 'HELD' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                আসন সাময়িক সংরক্ষিত (HELD)
              </span>
            )}
            {effectiveStatus === 'CONFIRMED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle className="w-3.5 h-3.5" />
                ভর্তি নিশ্চিত (CONFIRMED)
              </span>
            )}
            {effectiveStatus === 'EXPIRED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <XCircle className="w-3.5 h-3.5" />
                মেয়াদ শেষ (EXPIRED)
              </span>
            )}
            {effectiveStatus === 'CANCELLED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                <XCircle className="w-3.5 h-3.5" />
                আবেদন বাতিল (CANCELLED)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
              <Timer className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">মেয়াদ শেষ হতে সময় বাকি</div>
              <div className="text-3xl font-extrabold tracking-widest font-mono text-white">
                {effectiveStatus === 'HELD' ? timeFormatted : '০০:০০'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {effectiveStatus === 'HELD'
                  ? 'নির্ধারিত সময়ের মধ্যে ফি জমা না দিলে সিট উন্মুক্ত হবে'
                  : effectiveStatus === 'EXPIRED'
                  ? 'মেয়াদ উত্তীর্ণ হওয়ায় সিটটি অন্যের জন্য উন্মুক্ত হয়েছে'
                  : 'ফি গৃহীত হয়েছে'}
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col justify-center">
            <div className="text-xs text-slate-400 font-medium">আবেদন আইডি</div>
            <div className="text-sm font-mono text-indigo-200 mt-1">{hold.holdId}</div>
            <div className="text-xs text-slate-400 mt-2">
              মেয়াদ সমাপ্তির সময়:{' '}
              <span className="text-slate-300">
                {new Date(hold.expiresAt).toLocaleTimeString('bn-BD', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {effectiveStatus === 'HELD' && (
            <>
              <button
                type="button"
                onClick={() => onCancel(hold.holdId)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={() => onConfirm(hold.holdId)}
                disabled={isProcessing || isLocalExpired}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" />
                {isProcessing ? 'প্রক্রিয়াধীন...' : 'ভর্তি ফি দিন (Confirm)'}
              </button>
            </>
          )}

          {effectiveStatus === 'CONFIRMED' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                আপনার ভর্তি সফলভাবে নিশ্চিত হয়েছে!
              </div>
              {onViewReceipt && (
                <button
                  type="button"
                  onClick={() => onViewReceipt(hold)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  ভর্তি রশিদ প্রিন্ট করুন
                </button>
              )}
            </div>
          )}

          {effectiveStatus === 'EXPIRED' && (
            <div className="text-sm font-medium text-rose-300 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              মেয়াদ শেষ হয়ে গেছে। দয়া করে তালিকা থেকে পুনরায় আসন আবেদন করুন।
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
