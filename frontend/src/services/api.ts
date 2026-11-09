import { ClassItem, CreateClassPayload, HoldItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}, studentId?: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (studentId) {
    headers.set('X-Student-Id', studentId.trim());
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let message = 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। আবার চেষ্টা করুন।';
      if (data?.message) {
        message = translateErrorMessage(data.message, response.status);
      } else if (response.status === 404) {
        message = 'নির্দিষ্ট তথ্যটি সার্ভারে খুঁজে পাওয়া যায়নি।';
      } else if (response.status === 409) {
        message = 'আসন পূর্ণ হয়ে গেছে বা আপনার ইতোমধ্যে একটি আবেদন চালু আছে।';
      } else if (response.status === 400) {
        message = 'ভুল বা অসম্পূর্ণ তথ্য দেওয়া হয়েছে। অনুগ্রহ করে যাচাই করুন।';
      } else if (response.status === 403) {
        message = 'এই আবেদনে আপনার অধিকার নেই।';
      } else if (response.status >= 500) {
        message = 'সার্ভারে সাময়িক সমস্যা হচ্ছে। কিছুক্ষণ পর চেষ্টা করুন।';
      }
      throw new ApiError(message, response.status);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network failure / Server down
    throw new ApiError('সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। দয়া করে নিশ্চিত করুন ব্যাকএন্ড চালু আছে।', 0);
  }
}

function translateErrorMessage(msg: string, _status: number): string {
  const lower = msg.toLowerCase();
  if (lower.includes('no seats available')) {
    return 'দুঃখিত, এই ক্লাসে আর কোনো আসন খালি নেই!';
  }
  if (lower.includes('already has an active hold or confirmed')) {
    return 'আপনি ইতোমধ্যে এই ক্লাসে একটি সিট বুক করেছেন বা ভর্তি নিশ্চিত করেছেন।';
  }
  if (lower.includes('expired')) {
    return 'আবেদনের নির্ধারিত সময় শেষ হয়ে গেছে। আসনটি পুনরায় উন্মুক্ত করা হয়েছে।';
  }
  if (lower.includes('cancelled')) {
    return 'আবেদনটি বাতিল করা হয়েছে।';
  }
  if (lower.includes('valid 17-digit')) {
    return '১৭ অঙ্কের সঠিক জন্ম নিবন্ধন নম্বর লিখুন।';
  }
  if (lower.includes('only confirm your own hold') || lower.includes('only cancel your own hold')) {
    return 'আপনি কেবল নিজের আবেদনটিই পরিচালনা করতে পারবেন।';
  }
  return msg;
}

export const api = {
  // 1. POST /classes
  async createClass(payload: CreateClassPayload): Promise<ClassItem> {
    return request<ClassItem>('/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 2. GET /classes
  async getClasses(): Promise<ClassItem[]> {
    return request<ClassItem[]>('/classes');
  },

  // 3. GET /classes/{classId}
  async getClassById(classId: string): Promise<ClassItem> {
    return request<ClassItem>(`/classes/${classId}`);
  },

  // 4. POST /classes/{classId}/holds
  async holdSeat(classId: string, studentId: string): Promise<HoldItem> {
    return request<HoldItem>(`/classes/${classId}/holds`, {
      method: 'POST'
    }, studentId);
  },

  // 5. GET /holds/{holdId}
  async getHoldById(holdId: string): Promise<HoldItem> {
    return request<HoldItem>(`/holds/${holdId}`);
  },

  // 6. POST /holds/{holdId}/confirm
  async confirmAdmission(holdId: string, studentId: string): Promise<{ holdId: string; status: string }> {
    return request<{ holdId: string; status: string }>(`/holds/${holdId}/confirm`, {
      method: 'POST'
    }, studentId);
  },

  // 7. DELETE /holds/{holdId}
  async cancelHold(holdId: string, studentId: string): Promise<void> {
    return request<void>(`/holds/${holdId}`, {
      method: 'DELETE'
    }, studentId);
  },

  // 8. GET /me/holds
  async getMyHolds(studentId: string): Promise<HoldItem[]> {
    return request<HoldItem[]>('/me/holds', {
      method: 'GET'
    }, studentId);
  }
};
