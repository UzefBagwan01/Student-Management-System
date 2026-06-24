import { supabase } from './supabase';
import { Student, Attendance, Mark, Teacher, TeacherAttendance, QRSession, QRAttendance, FeeStructure, StudentFee, FeeTransaction } from '../types';

// Helper to convert snake_case (DB) to camelCase (Frontend)
const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Helper to convert camelCase (Frontend) to snake_case (DB)
const toSnake = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnake(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

export const mockDb = {
  getTeachers: async () => {
    const { data } = await supabase.from('teachers').select('*');
    return toCamel(data || []) as Teacher[];
  },
  addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
    const { data, error } = await supabase.from('teachers').insert([toSnake(teacher)]).select().single();
    if (error) { console.error(error); alert("DB Error: " + error.message); }
    if (teacher.userId) {
      await supabase.from('profiles').update({ role: 'teacher' }).eq('id', teacher.userId);
    }
    return toCamel(data) as Teacher;
  },
  updateTeacher: async (id: string, updates: Partial<Teacher>) => {
    await supabase.from('teachers').update(toSnake(updates)).eq('id', id);
  },
  deleteTeacher: async (id: string) => {
    await supabase.from('teachers').delete().eq('id', id);
  },

  getTeacherAttendances: async () => {
    const { data } = await supabase.from('teacher_attendances').select('*');
    return toCamel(data || []) as TeacherAttendance[];
  },
  addTeacherAttendance: async (attendance: Omit<TeacherAttendance, 'id'>) => {
    const { data } = await supabase.from('teacher_attendances').insert([toSnake(attendance)]).select().single();
    return toCamel(data) as TeacherAttendance;
  },

  getBranches: async () => {
    // Branches are not in supabase, keeping in localStorage for now
    const data = localStorage.getItem('branches');
    return data ? JSON.parse(data) : [];
  },
  addBranch: async (name: string) => {
    const branches = await mockDb.getBranches();
    const newBranch = { id: Math.random().toString(36).substring(2, 9), name };
    localStorage.setItem('branches', JSON.stringify([...branches, newBranch]));
    return newBranch;
  },
  deleteBranch: async (id: string) => {
    const branches = await mockDb.getBranches();
    localStorage.setItem('branches', JSON.stringify(branches.filter((b: any) => b.id !== id)));
  },

  getUsers: async () => {
    // Not directly possible from client to get all auth users securely, returning mock
    return [];
  },
  addUser: async (user: {email: string, password: string}) => {
    const res = await supabase.auth.signUp(user);
    if (res.error) {
      console.warn("Auth signUp returned an error (user might already exist):", res.error.message);
    }
    // Sign out immediately so admin doesn't take over the new user's session
    await supabase.auth.signOut();
    return res.data?.user;
  },

  getStudents: async () => { 
    const { data } = await supabase.from('students').select('*');
    return toCamel(data || []) as Student[];
  },
  addStudent: async (student: Omit<Student, 'id'>) => {
    const { data, error } = await supabase.from('students').insert([toSnake(student)]).select().single();
    if (error) { console.error(error); alert("DB Error: " + error.message); }
    return toCamel(data) as Student;
  },
  updateStudent: async (id: string, updates: Partial<Student>) => {
    await supabase.from('students').update(toSnake(updates)).eq('id', id);
  },
  deleteStudent: async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
  },
  
  getAttendances: async () => { 
    const { data } = await supabase.from('attendances').select('*');
    return toCamel(data || []) as Attendance[];
  },
  addAttendance: async (attendance: Omit<Attendance, 'id'>) => {
    const { data } = await supabase.from('attendances').insert([toSnake(attendance)]).select().single();
    return toCamel(data) as Attendance;
  },
  
  getMarks: async () => { 
    const { data } = await supabase.from('marks').select('*');
    return toCamel(data || []) as Mark[];
  },
  addMark: async (mark: Omit<Mark, 'id'>) => {
    const { data } = await supabase.from('marks').insert([toSnake(mark)]).select().single();
    return toCamel(data) as Mark;
  },

  getQRSessions: async () => {
    const { data } = await supabase.from('qr_sessions').select('*');
    return toCamel(data || []) as QRSession[];
  },
  addQRSession: async (session: Omit<QRSession, 'id'>) => {
    const payload = toSnake(session);
    if (typeof payload.created_at === 'number') {
      payload.created_at = new Date(payload.created_at).toISOString();
    }
    const { data, error } = await supabase.from('qr_sessions').insert([payload]).select().single();
    if (error) { console.error("Error:", error); alert("DB Error: " + error.message); }
    return toCamel(data) as QRSession;
  },
  deleteQRSession: async (id: string) => {
    await supabase.from('qr_sessions').delete().eq('id', id);
  },

  getQRAttendances: async () => {
    const { data } = await supabase.from('qr_attendances').select('*');
    return toCamel(data || []) as QRAttendance[];
  },
  addQRAttendance: async (attendance: Omit<QRAttendance, 'id'>) => {
    const payload = toSnake(attendance);
    if (typeof payload.timestamp === 'number') {
      payload.timestamp = new Date(payload.timestamp).toISOString();
    }
    const { data } = await supabase.from('qr_attendances').insert([payload]).select().single();
    return toCamel(data) as QRAttendance;
  },

  getFeeStructures: async () => {
    const { data } = await supabase.from('fee_structures').select('*');
    return toCamel(data || []) as FeeStructure[];
  },
  addFeeStructure: async (fee: Omit<FeeStructure, 'id'>) => {
    const payload = toSnake(fee);
    if (typeof payload.created_at === 'number') {
      payload.created_at = new Date(payload.created_at).toISOString();
    }
    const { data, error } = await supabase.from('fee_structures').insert([payload]).select().single();
    if (error) {
      console.error("Error adding fee structure:", error);
      alert("Error adding fee structure: " + error.message);
    }
    return toCamel(data) as FeeStructure;
  },
  deleteFeeStructure: async (id: string) => {
    await supabase.from('fee_structures').delete().eq('id', id);
  },

  getStudentFees: async () => {
    const { data } = await supabase.from('student_fees').select('*');
    return toCamel(data || []) as StudentFee[];
  },
  addStudentFee: async (fee: Omit<StudentFee, 'id'>) => {
    const payload = toSnake(fee);
    if (typeof payload.updated_at === 'number') {
      payload.updated_at = new Date(payload.updated_at).toISOString();
    }
    const { data, error } = await supabase.from('student_fees').insert([payload]).select().single();
    if (error) { console.error(error); alert("DB Error: " + error.message); }
    return toCamel(data) as StudentFee;
  },
  updateStudentFee: async (id: string, updates: Partial<StudentFee>) => {
    const payload = toSnake(updates);
    if (typeof payload.updated_at === 'number') {
      payload.updated_at = new Date(payload.updated_at).toISOString();
    }
    await supabase.from('student_fees').update(payload).eq('id', id);
  },

  getFeeTransactions: async () => {
    const { data } = await supabase.from('fee_transactions').select('*');
    return toCamel(data || []) as FeeTransaction[];
  },
  addFeeTransaction: async (txn: Omit<FeeTransaction, 'id'>) => {
    const payload = toSnake(txn);
    if (typeof payload.payment_date === 'number') {
      payload.payment_date = new Date(payload.payment_date).toISOString();
    }
    const { data } = await supabase.from('fee_transactions').insert([payload]).select().single();
    return toCamel(data) as FeeTransaction;
  }
};
