import { Student, Attendance, Mark, Teacher, TeacherAttendance, QRSession, QRAttendance, FeeStructure, StudentFee, FeeTransaction } from '../types';

const getTable = <T>(name: string): T[] => {

  const data = localStorage.getItem(name);
  return data ? JSON.parse(data) : [];
}

const setTable = (name: string, data: any[]) => {
  localStorage.setItem(name, JSON.stringify(data));
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const mockDb = {
  getTeachers: async () => {
    return getTable<Teacher>('teachers');
  },
  addTeacher: async (teacher: Omit<Teacher, 'id'>) => {
    const teachers = getTable<Teacher>('teachers');
    const newTeacher = { ...teacher, id: generateId() } as Teacher;
    setTable('teachers', [...teachers, newTeacher]);
    return newTeacher;
  },
  updateTeacher: async (id: string, data: Partial<Teacher>) => {
    const teachers = getTable<Teacher>('teachers');
    setTable('teachers', teachers.map(t => t.id === id ? { ...t, ...data } : t));
  },
  deleteTeacher: async (id: string) => {
    const teachers = getTable<Teacher>('teachers');
    setTable('teachers', teachers.filter(t => t.id !== id));
  },
  getTeacherAttendances: async () => {
    return getTable<TeacherAttendance>('teacher_attendance');
  },
  addTeacherAttendance: async (attendance: Omit<TeacherAttendance, 'id'>) => {
    const attendances = getTable<TeacherAttendance>('teacher_attendance');
    const newAtt = { ...attendance, id: generateId() } as TeacherAttendance;
    setTable('teacher_attendance', [...attendances, newAtt]);
    return newAtt;
  },
  getBranches: async () => {
    return getTable<{id: string, name: string}>('branches');
  },
  addBranch: async (name: string) => {
    const branches = getTable<{id: string, name: string}>('branches');
    const newBranch = { id: generateId(), name };
    setTable('branches', [...branches, newBranch]);
    return newBranch;
  },
  deleteBranch: async (id: string) => {
    const branches = getTable<{id: string, name: string}>('branches');
    setTable('branches', branches.filter(b => b.id !== id));
  },
  getUsers: async () => {
    return getTable<{email: string, password: string}>('users');
  },
  addUser: async (user: {email: string, password: string}) => {
    const users = getTable<{email: string, password: string}>('users');
    setTable('users', [...users, user]);
  },
  getStudents: async () => { 
    return getTable<Student>('students'); 
  },
  addStudent: async (student: Omit<Student, 'id'>) => {
    const students = getTable<Student>('students');
    const newStudent = { ...student, id: generateId() } as Student;
    setTable('students', [...students, newStudent]);
    return newStudent;
  },
  updateStudent: async (id: string, data: Partial<Student>) => {
    const students = getTable<Student>('students');
    setTable('students', students.map(s => s.id === id ? { ...s, ...data } : s));
  },
  deleteStudent: async (id: string) => {
    const students = getTable<Student>('students');
    setTable('students', students.filter(s => s.id !== id));
  },
  
  getAttendances: async () => { 
    return getTable<Attendance>('attendance'); 
  },
  addAttendance: async (attendance: Omit<Attendance, 'id'>) => {
    const attendances = getTable<Attendance>('attendance');
    const newAtt = { ...attendance, id: generateId() } as Attendance;
    setTable('attendance', [...attendances, newAtt]);
    return newAtt;
  },
  
  getMarks: async () => { 
    return getTable<Mark>('marks'); 
  },
  addMark: async (mark: Omit<Mark, 'id'>) => {
    const marks = getTable<Mark>('marks');
    const newMark = { ...mark, id: generateId() } as Mark;
    setTable('marks', [...marks, newMark]);
    return newMark;
  },

  getQRSessions: async () => {
    return getTable<QRSession>('qr_sessions');
  },
  addQRSession: async (session: Omit<QRSession, 'id'>) => {
    const sessions = getTable<QRSession>('qr_sessions');
    const newSession = { ...session, id: generateId() } as QRSession;
    setTable('qr_sessions', [...sessions, newSession]);
    return newSession;
  },
  deleteQRSession: async (id: string) => {
    const sessions = getTable<QRSession>('qr_sessions');
    setTable('qr_sessions', sessions.filter(s => s.id !== id));
  },

  getQRAttendances: async () => {
    return getTable<QRAttendance>('qr_attendances');
  },
  addQRAttendance: async (attendance: Omit<QRAttendance, 'id'>) => {
    const attendances = getTable<QRAttendance>('qr_attendances');
    const newAtt = { ...attendance, id: generateId() } as QRAttendance;
    setTable('qr_attendances', [...attendances, newAtt]);
    return newAtt;
  },

  getFeeStructures: async () => {
    return getTable<FeeStructure>('fee_structures');
  },
  addFeeStructure: async (fee: Omit<FeeStructure, 'id'>) => {
    const fees = getTable<FeeStructure>('fee_structures');
    const newFee = { ...fee, id: generateId() } as FeeStructure;
    setTable('fee_structures', [...fees, newFee]);
    return newFee;
  },
  deleteFeeStructure: async (id: string) => {
    const fees = getTable<FeeStructure>('fee_structures');
    setTable('fee_structures', fees.filter(f => f.id !== id));
  },
  getStudentFees: async () => {
    return getTable<StudentFee>('student_fees');
  },
  addStudentFee: async (fee: Omit<StudentFee, 'id'>) => {
    const fees = getTable<StudentFee>('student_fees');
    const newFee = { ...fee, id: generateId() } as StudentFee;
    setTable('student_fees', [...fees, newFee]);
    return newFee;
  },
  updateStudentFee: async (id: string, data: Partial<StudentFee>) => {
    const fees = getTable<StudentFee>('student_fees');
    setTable('student_fees', fees.map(f => f.id === id ? { ...f, ...data } : f));
  },
  getFeeTransactions: async () => {
    return getTable<FeeTransaction>('fee_transactions');
  },
  addFeeTransaction: async (txn: Omit<FeeTransaction, 'id'>) => {
    const txns = getTable<FeeTransaction>('fee_transactions');
    const newTxn = { ...txn, id: generateId() } as FeeTransaction;
    setTable('fee_transactions', [...txns, newTxn]);
    return newTxn;
  }
};
