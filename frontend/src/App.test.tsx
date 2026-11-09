import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import { StudentIdBar } from './components/StudentIdBar';
import { ActiveHoldCard } from './components/ActiveHoldCard';
import { HoldItem } from './types';

// Mock fetch globally
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    if (url.includes('/classes')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            id: 'c_1',
            name: 'Class 6 - Morning Shift',
            totalSeats: 120,
            heldSeats: 15,
            confirmedSeats: 80,
            availableSeats: 25
          }
        ])
      });
    }
    if (url.includes('/me/holds')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    });
  }));
});

describe('School Admission Frontend Tests', () => {
  it('renders student identification input bar', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /অনলাইন স্কুল ভর্তি সিস্টেম/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/১৭ অঙ্কের জন্ম নিবন্ধন নম্বর/i)).toBeInTheDocument();
  });

  it('validates 17-digit student id and indicates completion', () => {
    const setStudentId = vi.fn();
    render(<StudentIdBar studentId="20152691234567890" setStudentId={setStudentId} />);

    expect(screen.getByText(/✓ জন্ম নিবন্ধন নম্বর সম্পন্ন হয়েছে/i)).toBeInTheDocument();
  });

  it('shows incomplete indicator when student id has fewer than 17 digits', () => {
    const setStudentId = vi.fn();
    render(<StudentIdBar studentId="123456" setStudentId={setStudentId} />);

    expect(screen.getByText(/আর 11 টি অঙ্ক বাকি/i)).toBeInTheDocument();
  });

  it('disables payment confirm button when hold is expired', () => {
    const expiredHold: HoldItem = {
      holdId: 'h_test_1',
      classId: 'c_1',
      className: 'Class 6 - Morning Shift',
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 60000).toISOString() // 1 min in past
    };

    render(
      <ActiveHoldCard
        hold={expiredHold}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isProcessing={false}
      />
    );

    expect(screen.getByText(/মেয়াদ শেষ \(EXPIRED\)/i)).toBeInTheDocument();
    // Confirm button should not be present or should be disabled
    expect(screen.queryByText(/ভর্তি ফি দিন/i)).not.toBeInTheDocument();
  });

  it('renders active countdown timer for HELD reservation', () => {
    const activeHold: HoldItem = {
      holdId: 'h_test_2',
      classId: 'c_1',
      className: 'Class 6 - Morning Shift',
      status: 'HELD',
      expiresAt: new Date(Date.now() + 300000).toISOString() // 5 min in future
    };

    render(
      <ActiveHoldCard
        hold={activeHold}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isProcessing={false}
      />
    );

    expect(screen.getByText(/আসন সাময়িক সংরক্ষিত \(HELD\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ভর্তি ফি দিন/i })).toBeInTheDocument();
  });
});
