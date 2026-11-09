import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { CreateClassPayload } from '../types';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateClassPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [name, setName] = useState('');
  const [totalSeats, setTotalSeats] = useState<number | ''>(60);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('ক্লাসের নাম দেওয়া আবশ্যক (যেমন: Class 6 - Morning Shift)');
      return;
    }

    if (!totalSeats || Number(totalSeats) <= 0) {
      setError('আসন সংখ্যা ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        totalSeats: Number(totalSeats)
      });
      setName('');
      setTotalSeats(60);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ক্লাস তৈরি করতে সমস্যা হয়েছে।');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">
              নতুন ক্লাস ও শিফট তৈরি (School Admin)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ক্লাসের নাম ও শিফট
            </label>
            <input
              type="text"
              placeholder="যেমন: Class 6 - Morning Shift"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              মোট আসন সংখ্যা (Total Seats)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              placeholder="যেমন: 120"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'তৈরি হচ্ছে...' : 'ক্লাস সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
