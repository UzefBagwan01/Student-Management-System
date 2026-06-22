import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { Student, Attendance, Mark, StudentFee, FeeTransaction, QRAttendance } from '../types';
import { Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent } from './ui/Card';

export function StudentProfileView({ student, onClose }: { student: Student, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [qrAttendances, setQrAttendances] = useState<QRAttendance[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  
  const [viewType, setViewType] = useState<'overview'|'attendance'|'marks'|'fees'>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const att = await mockDb.getAttendances();
        setAttendances(att.filter(a => a.studentId === student.id));
        const qra = await mockDb.getQRAttendances();
        setQrAttendances(qra.filter(a => a.studentId === student.id));
        const m = await mockDb.getMarks();
        setMarks(m.filter(x => x.studentId === student.id));
        const sf = await mockDb.getStudentFees();
        setFees(sf.filter(x => x.studentId === student.id));
        const ft = await mockDb.getFeeTransactions();
        setTransactions(ft.filter(t => t.studentId === student.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [student]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  }

  // Calculate overview stats
  const totalFees = fees.reduce((sum, f) => sum + f.totalFee, 0);
  const paidFees = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const pendingFees = fees.reduce((sum, f) => sum + f.pendingAmount, 0);

  const presentCount = attendances.filter(a => a.status === 'Present').length + qrAttendances.length;
  // This is a naive approximation for total lectures
  const totalCount = attendances.length + qrAttendances.length; 
  const attendanceRate = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);

  const averageInternal = marks.length > 0 ? marks.reduce((sum, m) => sum + m.internalMarks, 0) / marks.length : 0;

  return (
    <div className="space-y-4">
       <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
         {['overview', 'attendance', 'marks', 'fees'].map((tab) => (
            <button
              key={tab}
              onClick={() => setViewType(tab as any)}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-colors capitalize ${viewType === tab ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'}`}
            >
              {tab}
            </button>
         ))}
       </div>

       {viewType === 'overview' && (
         <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Full Name</label>
                  <p className="text-sm font-semibold">{student.fullName}</p>
               </div>
               <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Student ID</label>
                  <p className="text-sm font-semibold">{student.studentId}</p>
               </div>
               <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Department</label>
                  <p className="text-sm font-semibold">{student.department}</p>
               </div>
               <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Contact</label>
                  <p className="text-sm font-semibold">{student.email}</p>
               </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
               <div className="bg-indigo-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-black text-indigo-700">{attendanceRate}%</div>
                  <div className="text-[10px] font-bold text-indigo-800 uppercase">Attendance</div>
               </div>
               <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-black text-green-700">{averageInternal.toFixed(1)}</div>
                  <div className="text-[10px] font-bold text-green-800 uppercase">Avg Internal</div>
               </div>
               <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-black text-orange-700">₹{pendingFees.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-orange-800 uppercase">Fee Dues</div>
               </div>
            </div>
         </div>
       )}

       {viewType === 'fees' && (
         <div className="space-y-4">
            <div className="flex justify-between bg-indigo-600 text-white rounded-xl p-4">
               <div>
                  <p className="text-xs uppercase font-bold text-indigo-200">Total Fees</p>
                  <p className="text-xl font-black">₹{totalFees.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-xs uppercase font-bold text-indigo-200">Paid Fees</p>
                  <p className="text-xl font-black text-green-300">₹{paidFees.toLocaleString()}</p>
               </div>
               <div className="text-right">
                  <p className="text-xs uppercase font-bold text-indigo-200">Pending</p>
                  <p className="text-xl font-black text-red-300">₹{pendingFees.toLocaleString()}</p>
               </div>
            </div>
            
            <h4 className="text-sm font-bold pt-2">Assigned Fees</h4>
            <div className="space-y-2">
               {fees.map(f => (
                  <div key={f.id} className="text-sm p-3 bg-gray-50 border rounded-lg flex justify-between">
                     <div>
                        <p className="font-semibold">{f.academicYear} Fee</p>
                        <p className="text-xs text-gray-500">Due: {f.dueDate}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold">Total: ₹{f.totalFee}</p>
                        <p className={`text-xs font-bold ${f.pendingAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>{f.pendingAmount > 0 ? `${Math.round(f.paidAmount/f.totalFee*100)}% Paid` : 'Cleared'}</p>
                     </div>
                  </div>
               ))}
               {fees.length===0 && <p className="text-xs text-center p-4">No fees assigned.</p>}
            </div>

            <h4 className="text-sm font-bold pt-4">Transaction History</h4>
            <div className="space-y-2">
               {transactions.map(t => (
                  <div key={t.id} className="text-sm p-3 bg-gray-50 border rounded-lg flex justify-between items-center">
                     <div>
                        <p className="font-semibold flex items-center">
                           <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                           ₹{t.amountPaid}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(t.paymentDate).toLocaleDateString()} • {t.receiptNumber}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">{t.status}</span>
                        <button onClick={() => {
                           const doc = new jsPDF();
                           doc.setFontSize(22);
                           doc.setTextColor(79, 70, 229);
                           doc.text("COLLEGE FEE RECEIPT", 105, 20, { align: "center" });
                           doc.setFontSize(10);
                           doc.setTextColor(100, 100, 100);
                           doc.text(`Receipt No: ${t.receiptNumber}`, 20, 35);
                           doc.text(`Date: ${new Date(t.paymentDate).toLocaleDateString()}`, 150, 35);
                           doc.setTextColor(0, 0, 0);
                           doc.setFontSize(12);
                           doc.text("Student Details:", 20, 50);
                           doc.setFontSize(10);
                           doc.text(`ID: ${student.studentId} | Name: ${student.fullName}`, 20, 58);
                           autoTable(doc, {
                              startY: 70,
                              head: [['Description', 'Amount (INR)']],
                              body: [['Fee Payment', `Rs. ${t.amountPaid}`]],
                              theme: 'grid',
                              headStyles: { fillColor: [79, 70, 229] }
                           });
                           doc.save(`${t.receiptNumber}.pdf`);
                        }} className="text-indigo-600 hover:text-indigo-800"><Download size={16}/></button>
                     </div>
                  </div>
               ))}
               {transactions.length===0 && <p className="text-xs text-center p-4">No transactions found.</p>}
            </div>
         </div>
       )}

       {viewType === 'attendance' && (
         <div className="space-y-4">
            <p className="text-sm font-semibold">Total Lectures Recorded: {totalCount}</p>
            <div className="space-y-1 mt-2 max-h-[300px] overflow-y-auto">
               {attendances.map(a => (
                  <div key={a.id} className="flex justify-between p-2 text-sm border-b">
                     <span>{a.date}</span>
                     <span className={`font-bold ${a.status==='Present'?'text-green-600':'text-red-600'}`}>{a.status}</span>
                  </div>
               ))}
               {qrAttendances.map(a => (
                  <div key={a.id} className="flex justify-between p-2 text-sm border-b">
                     <span>{new Date(a.timestamp).toLocaleDateString()} (QR)</span>
                     <span className="text-green-600 font-bold">Present</span>
                  </div>
               ))}
            </div>
         </div>
       )}

       {viewType === 'marks' && (
         <div className="space-y-4">
            {marks.map(m => (
               <div key={m.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between mb-2">
                     <span className="font-bold text-sm">{m.subjectName}</span>
                     <span className="font-bold text-sm text-indigo-600">Grade: {m.grade}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                     <span>Internal: {m.internalMarks}</span>
                     <span>External: {m.externalMarks}</span>
                     <span>Total: {m.totalMarks}</span>
                  </div>
               </div>
            ))}
            {marks.length === 0 && <p className="text-sm text-center">No marks available.</p>}
         </div>
       )}

       <div className="flex justify-end pt-4 mt-4 border-t dark:border-neutral-800">
         <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition">
           Close / Back
         </button>
       </div>
    </div>
  );
}
