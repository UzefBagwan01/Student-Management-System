export type Role = 'admin' | 'student' | 'teacher';

export interface User {
  uid: string;
  email: string;
  role: Role;
}

export interface Teacher {
  id: string;
  userId?: string;
  teacherId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  date: string;
  status: 'Present' | 'Absent';
}

export interface Student {
  id: string;
  userId?: string;
  studentId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
  year: string;
  gender: string;
  address: string;
  photoUrl?: string; // Bonus feature
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'Present' | 'Absent';
}

export interface Mark {
  id: string;
  studentId: string;
  subjectName: string;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
}

export interface QRSession {
  id: string;
  department: string;
  year: string;
  subject: string;
  lectureName: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: number;
}

export interface QRAttendance {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: number;
}

export interface FeeStructure {
  id: string;
  academicYear: string;
  department: string;
  year: string;
  tuitionFee: number;
  examFee: number;
  libraryFee: number;
  laboratoryFee: number;
  developmentFee: number;
  otherCharges: number;
  totalFee: number;
  createdAt: number;
}

export interface StudentFee {
  id: string;
  studentId: string;
  feeStructureId: string;
  academicYear: string;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  updatedAt: number;
}

export interface FeeTransaction {
  id: string;
  studentFeeId: string;
  studentId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  amountPaid: number;
  paymentDate: number;
  paymentMethod: string;
  status: 'Success' | 'Pending' | 'Failed';
  receiptNumber: string;
}
