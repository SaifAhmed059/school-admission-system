import { useState, useEffect, useCallback, useMemo } from 'react';
import { School, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { ClassItem, HoldItem, CreateClassPayload } from './types';
import { api, ApiError } from './services/api';
import { StudentIdBar } from './components/StudentIdBar';
import { ActiveHoldCard } from './components/ActiveHoldCard';
import { ClassList } from './components/ClassList';
import { MyApplications } from './components/MyApplications';
import { CreateClassModal } from './components/CreateClassModal';
import { Toast, ToastMessage } from './components/Toast';

const STORAGE_STUDENT_ID_KEY = 'admission_student_id';

export function App() {
  // 1. Student ID State (persisted in localStorage)
  const [studentId, setStudentId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_STUDENT_ID_KEY) || '';
  });

  const handleStudentIdChange = (id: string) => {
    setStudentId(id);
    localStorage.setItem(STORAGE_STUDENT_ID_KEY, id);
  };

  // 2. Data States
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [myHolds, setMyHolds] = useState<HoldItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);
  const [isRefreshingHolds, setIsRefreshingHolds] = useState<boolean>(false);
  const [applyingClassId, setApplyingClassId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCreatingClass, setIsCreatingClass] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 3. Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 4. Fetch Classes
  const fetchClasses = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoadingClasses(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
      setServerError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      }
    } finally {
      if (!quiet) setIsLoadingClasses(false);
    }
  }, []);

  // 5. Fetch My Holds
  const fetchMyHolds = useCallback(async () => {
    const validStudentId = studentId.replace(/\D/g, '');
    if (validStudentId.length !== 17) {
      setMyHolds([]);
      return;
    }

    setIsRefreshingHolds(true);
    try {
      const holds = await api.getMyHolds(validStudentId);
      setMyHolds(holds);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // quiet fail on background polling, or show if explicit
      }
    } finally {
      setIsRefreshingHolds(false);
    }
  }, [studentId]);

  // Initial load
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchMyHolds();
  }, [fetchMyHolds]);

  // Real-time Polling: updates class seat numbers and student holds every 4 seconds without reload (Rule 10)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchClasses(true);
      if (studentId.replace(/\D/g, '').length === 17) {
        fetchMyHolds();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchClasses, fetchMyHolds, studentId]);

  // Find latest active HELD application for the banner (Rule 9 & 11)
  const activeHold = useMemo(() => {
    return myHolds.find((h) => {
      if (h.status !== 'HELD') return false;
      const isStillValid = new Date(h.expiresAt).getTime() > Date.now();
      return isStillValid;
    });
  }, [myHolds]);

  // 6. Handle Seat Hold (Apply)
  const handleApply = async (classId: string) => {
    const validStudentId = studentId.replace(/\D/g, '');
    if (validStudentId.length !== 17) {
      addToast('error', 'দয়া করে প্রথমে ১৭ অঙ্কের সঠিক জন্ম নিবন্ধন নম্বর দিন।');
      return;
    }

    setApplyingClassId(classId);
    try {
      await api.holdSeat(classId, validStudentId);
      addToast('success', 'আসন সাময়িকভাবে বুকিং (HELD) করা হয়েছে! নির্ধারিত সময়ের মধ্যে ভর্তি ফি প্রদান করুন।');
      // Immediately refresh list & holds
      await Promise.all([fetchClasses(true), fetchMyHolds()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        addToast('error', err.message);
      } else {
        addToast('error', 'আবেদন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setApplyingClassId(null);
    }
  };

  // 7. Handle Payment / Confirm Admission
  const handleConfirmAdmission = async (holdId: string) => {
    const validStudentId = studentId.replace(/\D/g, '');
    if (validStudentId.length !== 17) {
      addToast('error', '১৭ অঙ্কের জন্ম নিবন্ধন নম্বর প্রয়োজন।');
      return;
    }

    setIsProcessingPayment(true);
    try {
      await api.confirmAdmission(holdId, validStudentId);
      addToast('success', 'অভিনন্দন! ভর্তি ফি সফলভাবে গৃহীত হয়েছে এবং ভর্তি নিশ্চিত করা হয়েছে।');
      await Promise.all([fetchClasses(true), fetchMyHolds()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        addToast('error', err.message);
      } else {
        addToast('error', 'ভর্তি ফি প্রদানে সমস্যা হয়েছে।');
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 8. Handle Hold Cancel
  const handleCancelHold = async (holdId: string) => {
    const validStudentId = studentId.replace(/\D/g, '');
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই আসন বুকিং বাতিল করতে চান?')) {
      return;
    }

    setIsProcessingPayment(true);
    try {
      await api.cancelHold(holdId, validStudentId);
      addToast('success', 'আসন বুকিং সফলভাবে বাতিল করা হয়েছে এবং সিটটি উন্মুক্ত করা হয়েছে।');
      await Promise.all([fetchClasses(true), fetchMyHolds()]);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        addToast('error', err.message);
      } else {
        addToast('error', 'বাতিল করতে সমস্যা হয়েছে।');
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 9. Handle Create Class (Admin)
  const handleCreateClass = async (payload: CreateClassPayload) => {
    setIsCreatingClass(true);
    try {
      await api.createClass(payload);
      addToast('success', `নতুন ক্লাস "${payload.name}" সফলভাবে তৈরি হয়েছে!`);
      await fetchClasses(true);
    } finally {
      setIsCreatingClass(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                অনলাইন স্কুল ভর্তি সিস্টেম
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                আগে আসলে আগে পাবেন ভিত্তিতে তাৎক্ষণিক ভর্তি প্ল্যাটফর্ম
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchClasses()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="রিফ্রেশ"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingClasses ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">নতুন ক্লাস তৈরি</span> (Admin)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Server connection error banner */}
        {serverError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="text-sm font-bold">সার্ভার সংযোগ সমস্যা</div>
                <div className="text-xs text-rose-600">{serverError}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchClasses()}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
            >
              পুনরায় চেষ্টা
            </button>
          </div>
        )}

        {/* 1. Student Identification Bar */}
        <StudentIdBar studentId={studentId} setStudentId={handleStudentIdChange} />

        {/* 2. Active Hold View / Banner (Rule 9 & 11) */}
        {activeHold && (
          <ActiveHoldCard
            hold={activeHold}
            onConfirm={handleConfirmAdmission}
            onCancel={handleCancelHold}
            isProcessing={isProcessingPayment}
          />
        )}

        {/* 3. Class List */}
        <ClassList
          classes={classes}
          studentId={studentId}
          activeHolds={myHolds}
          onApply={handleApply}
          applyingClassId={applyingClassId}
          isLoading={isLoadingClasses}
        />

        {/* 4. My Applications Table */}
        <MyApplications
          holds={myHolds}
          studentId={studentId}
          onRefresh={fetchMyHolds}
          isRefreshing={isRefreshingHolds}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400">
          অনলাইন স্কুল ভর্তি সিস্টেম · Onnorokom Projukti Limited
        </div>
      </footer>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateClass}
        isSubmitting={isCreatingClass}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
