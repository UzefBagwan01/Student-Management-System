import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import { mockDb } from '../lib/mockDb';
import { FeeStructure, StudentFee, FeeTransaction, Student } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, Loader2, Download, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FeeManagementAdmin() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'structure' | 'assign' | 'reports' | 'defaulters'>('dashboard');
  
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Fee structure modal state
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structureForm, setStructureForm] = useState<Partial<FeeStructure>>({});
  const [savingStructure, setSavingStructure] = useState(false);

  // Assign fees modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ feeStructureId: '', target: 'student', studentId: '', department: '', year: '', dueDate: '' });
  const [assigningLoading, setAssigningLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const b = await mockDb.getBranches();
      setBranches(b);
      const st = await mockDb.getStudents();
      setStudents(st);
      const fs = await mockDb.getFeeStructures();
      setFeeStructures(fs);
      const sf = await mockDb.getStudentFees();
      setStudentFees(sf);
      const tx = await mockDb.getFeeTransactions();
      setTransactions(tx);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin') fetchData();
  }, [role]);

  if (role !== 'admin') return <Navigate to="/" />;

  // Computed Dashboard Stats
  const totalFeesAssigned = studentFees.reduce((sum, f) => sum + f.totalFee, 0);
  const totalFeesCollected = studentFees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalFeesPending = studentFees.reduce((sum, f) => sum + f.pendingAmount, 0);
  
  const paidStudentsCount = studentFees.filter(f => f.pendingAmount === 0).length;
  const defaulterStudentsCount = studentFees.filter(f => f.pendingAmount > 0 && new Date(f.dueDate).getTime() < Date.now()).length;

  // Handlers
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStructure(true);
    try {
      const total = Number(structureForm.tuitionFee || 0) + Number(structureForm.examFee || 0) + Number(structureForm.libraryFee || 0) + Number(structureForm.laboratoryFee || 0) + Number(structureForm.developmentFee || 0) + Number(structureForm.otherCharges || 0);
      const payload = {
        ...structureForm,
        department: structureForm.department || '',
        year: structureForm.year || '',
        academicYear: structureForm.academicYear || '',
        tuitionFee: Number(structureForm.tuitionFee || 0),
        examFee: Number(structureForm.examFee || 0),
        libraryFee: Number(structureForm.libraryFee || 0),
        laboratoryFee: Number(structureForm.laboratoryFee || 0),
        developmentFee: Number(structureForm.developmentFee || 0),
        otherCharges: Number(structureForm.otherCharges || 0),
        totalFee: total,
        createdAt: Date.now()
      } as Omit<FeeStructure, 'id'>;
      
      await mockDb.addFeeStructure(payload);
      setIsStructureModalOpen(false);
      fetchData();
    } catch(err) {
      console.error(err);
    } finally {
      setSavingStructure(false);
    }
  };

  const handleAssignFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningLoading(true);
    try {
      const fs = feeStructures.find(f => f.id === assignForm.feeStructureId);
      if (!fs) return;
      
      let targets: Student[] = [];
      if (assignForm.target === 'student') {
         targets = students.filter(s => s.id === assignForm.studentId);
      } else if (assignForm.target === 'department') {
         targets = students.filter(s => s.department === assignForm.department);
      } else if (assignForm.target === 'year') {
         targets = students.filter(s => s.year === assignForm.year);
      } else if (assignForm.target === 'class') {
         targets = students.filter(s => s.department === assignForm.department && s.year === assignForm.year);
      }

      for (const s of targets) {
        // checks if fee already assigned for this struct and student
        const existing = studentFees.find(f => f.studentId === s.id && f.feeStructureId === fs.id);
        if (!existing) {
           await mockDb.addStudentFee({
             studentId: s.id,
             feeStructureId: fs.id,
             academicYear: fs.academicYear,
             totalFee: fs.totalFee,
             paidAmount: 0,
             pendingAmount: fs.totalFee,
             dueDate: assignForm.dueDate,
             updatedAt: Date.now()
           });
        }
      }
      setIsAssignModalOpen(false);
      fetchData();
    } catch(err) {
      console.error(err);
    } finally {
      setAssigningLoading(false);
    }
  };

  const [viewStudentFeeId, setViewStudentFeeId] = useState<string | null>(null);

  const getStudentInfo = (id: string) => students.find(s => s.id === id);

  const groupedStudentFees = studentFees.reduce((acc, sf) => {
    if (!acc[sf.studentId]) {
      acc[sf.studentId] = {
        studentId: sf.studentId,
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        fees: [] as StudentFee[]
      };
    }
    acc[sf.studentId].totalFee += sf.totalFee;
    acc[sf.studentId].paidAmount += sf.paidAmount;
    acc[sf.studentId].pendingAmount += sf.pendingAmount;
    acc[sf.studentId].fees.push(sf);
    return acc;
  }, {} as Record<string, { studentId: string, totalFee: number, paidAmount: number, pendingAmount: number, fees: StudentFee[] }>);

  const consolidatedFees: { studentId: string, totalFee: number, paidAmount: number, pendingAmount: number, fees: StudentFee[] }[] = Object.values(groupedStudentFees);

  const handleDownloadAssignedFees = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text("Assigned Fees Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = consolidatedFees.map(f => {
       const st = getStudentInfo(f.studentId);
       return [
         st?.fullName || 'Unknown',
         st?.studentId || '-',
         st?.department || '-',
         `Rs. ${f.totalFee.toLocaleString()}`,
         `Rs. ${f.paidAmount.toLocaleString()}`,
         `Rs. ${f.pendingAmount.toLocaleString()}`
       ];
    });

    autoTable(doc, {
       startY: 35,
       head: [['Student Name', 'Student ID', 'Department', 'Total Assigned', 'Paid', 'Pending']],
       body: tableData,
       theme: 'grid',
       headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`assigned_fees_report_${new Date().getTime()}.pdf`);
  };

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text("Fee Collection Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = transactions.map(t => {
       const st = getStudentInfo(t.studentId);
       return [
         new Date(t.paymentDate).toLocaleDateString(),
         t.receiptNumber,
         st?.fullName || 'Unknown',
         t.paymentMethod,
         `Rs. ${t.amountPaid.toLocaleString()}`,
         t.status
       ];
    });

    autoTable(doc, {
       startY: 35,
       head: [['Date', 'Receipt No.', 'Student', 'Method', 'Amount', 'Status']],
       body: tableData,
       theme: 'grid',
       headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`fee_collection_report_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Fee Management</h2>
      </div>

      <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
        {['dashboard', 'structure', 'assign', 'reports', 'defaulters'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-2 px-4 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-white dark:bg-neutral-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : activeTab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-indigo-600 border-none text-white shadow-md">
               <CardContent className="p-6">
                 <div className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">Total Assigned</div>
                 <div className="text-3xl font-black">₹{totalFeesAssigned.toLocaleString()}</div>
               </CardContent>
            </Card>
            <Card className="bg-green-600 border-none text-white shadow-md">
               <CardContent className="p-6">
                 <div className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">Total Collected</div>
                 <div className="text-3xl font-black">₹{totalFeesCollected.toLocaleString()}</div>
               </CardContent>
            </Card>
            <Card className="bg-red-600 border-none text-white shadow-md">
               <CardContent className="p-6">
                 <div className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">Pending Dues</div>
                 <div className="text-3xl font-black">₹{totalFeesPending.toLocaleString()}</div>
               </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                {transactions.length === 0 ? <p className="text-gray-500 text-sm">No recent transactions.</p> : (
                  <div className="space-y-3">
                    {transactions.sort((a,b) => b.paymentDate - a.paymentDate).slice(0, 5).map(t => {
                      const st = getStudentInfo(t.studentId);
                      return (
                        <div key={t.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-neutral-800 rounded-lg">
                          <div>
                            <p className="font-semibold">{st?.fullName}</p>
                            <p className="text-xs text-gray-500">{new Date(t.paymentDate).toLocaleDateString()} • {t.receiptNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+₹{t.amountPaid.toLocaleString()}</p>
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Status Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-neutral-200">{students.length}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">Total Students</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-600">{paidStudentsCount}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">Fully Paid</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl text-center col-span-2">
                    <p className="text-2xl font-bold text-red-600">{defaulterStudentsCount}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">Defaulters (Deadline Passed)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeTab === 'structure' ? (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Fee Structures</CardTitle>
            <button onClick={() => setIsStructureModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center">
              <Plus size={16} className="mr-2"/> Add Structure
            </button>
          </CardHeader>
          <CardContent>
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 dark:bg-neutral-900 border-y border-gray-200 dark:border-neutral-800 text-xs font-bold text-gray-500 uppercase">
                   <th className="px-4 py-3">Academic Year</th>
                   <th className="px-4 py-3">Dept & Year</th>
                   <th className="px-4 py-3 text-right">Total Fee (₹)</th>
                   <th className="px-4 py-3 text-right">Tuition</th>
                   <th className="px-4 py-3 text-right">Other</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                 {feeStructures.length === 0 ? <tr><td colSpan={5} className="text-center p-6 text-gray-500">No structures defined.</td></tr> :
                   feeStructures.map(f => (
                     <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                       <td className="px-4 py-3 text-sm font-semibold">{f.academicYear}</td>
                       <td className="px-4 py-3 text-sm text-gray-600">{f.department || 'All'} - {f.year || 'All'}</td>
                       <td className="px-4 py-3 text-sm font-bold text-right">₹{f.totalFee.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm text-gray-500 text-right">₹{f.tuitionFee.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm text-gray-500 text-right">₹{(f.totalFee - f.tuitionFee).toLocaleString()}</td>
                     </tr>
                   ))
                 }
               </tbody>
             </table>
          </CardContent>
        </Card>
      ) : activeTab === 'assign' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Assigned Student Fees</CardTitle>
              <div className="flex space-x-2">
                <button onClick={handleDownloadAssignedFees} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-sm flex items-center">
                  <Download size={16} className="mr-2"/> Download
                </button>
                <button onClick={() => setIsAssignModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center">
                  <Plus size={16} className="mr-2"/> Assign Fees
                </button>
              </div>
            </CardHeader>
            <CardContent>
               <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 dark:bg-neutral-900 border-y border-gray-200 dark:border-neutral-800 text-xs font-bold text-gray-500 uppercase">
                   <th className="px-4 py-3">Student</th>
                   <th className="px-4 py-3 text-right">Total Assigned (₹)</th>
                   <th className="px-4 py-3 text-right">Paid (₹)</th>
                   <th className="px-4 py-3 text-right">Pending (₹)</th>
                   <th className="px-4 py-3 text-center">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                 {consolidatedFees.length === 0 ? <tr><td colSpan={5} className="text-center p-6 text-gray-500">No fees assigned to students.</td></tr> :
                   consolidatedFees.map(cf => {
                     const st = getStudentInfo(cf.studentId);
                     return (
                     <tr key={cf.studentId} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                       <td className="px-4 py-3 text-sm font-semibold">{st?.fullName}<div className="text-xs text-gray-500 font-normal">{st?.studentId} • {st?.department}</div></td>
                       <td className="px-4 py-3 text-sm font-bold text-right">₹{cf.totalFee.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm text-green-600 font-semibold text-right">₹{cf.paidAmount.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm text-red-600 font-semibold text-right">₹{cf.pendingAmount.toLocaleString()}</td>
                       <td className="px-4 py-3 text-center text-sm">
                         <button onClick={() => setViewStudentFeeId(cf.studentId)} className="text-indigo-600 hover:text-indigo-800 font-bold">
                           View More
                         </button>
                       </td>
                     </tr>
                   )})}
               </tbody>
             </table>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'reports' ? (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Payment Transactions</CardTitle>
            <button onClick={handleDownloadReport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center">
              <Download size={16} className="mr-2"/> Download Report
            </button>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 dark:bg-neutral-900 border-y border-gray-200 dark:border-neutral-800 text-xs font-bold text-gray-500 uppercase">
                   <th className="px-4 py-3">Date</th>
                   <th className="px-4 py-3">Receipt / Txn ID</th>
                   <th className="px-4 py-3">Student</th>
                   <th className="px-4 py-3">Method</th>
                   <th className="px-4 py-3 text-right">Amount (₹)</th>
                   <th className="px-4 py-3">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                 {transactions.length === 0 ? <tr><td colSpan={6} className="text-center p-6 text-gray-500">No transactions recorded.</td></tr> :
                   transactions.map(t => {
                     const st = getStudentInfo(t.studentId);
                     return (
                     <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                       <td className="px-4 py-3 text-sm">{new Date(t.paymentDate).toLocaleDateString()}</td>
                       <td className="px-4 py-3 text-sm text-gray-500">{t.receiptNumber}<br/><span className="text-xs">{t.razorpayPaymentId}</span></td>
                       <td className="px-4 py-3 text-sm font-semibold">{st?.fullName}</td>
                       <td className="px-4 py-3 text-sm">{t.paymentMethod}</td>
                       <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">+₹{t.amountPaid.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{t.status}</span></td>
                     </tr>
                   )})}
               </tbody>
             </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertCircle className="mr-2" /> Defaulters (Deadline Exceeded)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 dark:bg-neutral-900 border-y border-gray-200 dark:border-neutral-800 text-xs font-bold text-gray-500 uppercase">
                   <th className="px-4 py-3">Student</th>
                   <th className="px-4 py-3">Department</th>
                   <th className="px-4 py-3 text-right">Total Due (₹)</th>
                   <th className="px-4 py-3">Due Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                 {studentFees.filter(f => f.pendingAmount > 0 && new Date(f.dueDate).getTime() < Date.now()).length === 0 ? <tr><td colSpan={4} className="text-center p-6 text-gray-500">No defaulters found.</td></tr> :
                   studentFees.filter(f => f.pendingAmount > 0 && new Date(f.dueDate).getTime() < Date.now()).map(sf => {
                     const st = getStudentInfo(sf.studentId);
                     return (
                     <tr key={sf.id} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                       <td className="px-4 py-3 text-sm font-semibold">{st?.fullName}</td>
                       <td className="px-4 py-3 text-sm text-gray-600">{st?.department} - {st?.year}</td>
                       <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">₹{sf.pendingAmount.toLocaleString()}</td>
                       <td className="px-4 py-3 text-sm text-gray-500">{sf.dueDate}</td>
                     </tr>
                   )})}
               </tbody>
             </table>
          </CardContent>
        </Card>
      )}

      {/* Structure Modal */}
      <Modal isOpen={isStructureModalOpen} onClose={() => setIsStructureModalOpen(false)} title="Create Fee Structure">
        <form onSubmit={handleSaveStructure} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Academic Year</label>
               <input required type="text" placeholder="2023-2024" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.academicYear || ''} onChange={e => setStructureForm({...structureForm, academicYear: e.target.value})} />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Department</label>
               <select className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.department || ''} onChange={e => setStructureForm({...structureForm, department: e.target.value})}>
                 <option value="">All Departments</option>
                 {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Year</label>
               <select className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.year || ''} onChange={e => setStructureForm({...structureForm, year: e.target.value})}>
                 <option value="">All Years</option>
                 <option value="1st Year">1st Year</option>
                 <option value="2nd Year">2nd Year</option>
                 <option value="3rd Year">3rd Year</option>
                 <option value="4th Year">4th Year</option>
               </select>
             </div>
             <div className="col-span-2 grid grid-cols-2 gap-4 mt-2 border-t pt-4">
                <div className="space-y-1">
                 <label className="text-xs font-medium text-neutral-500">Tuition Fee (₹)</label>
                 <input type="number" required min="0" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.tuitionFee || ''} onChange={e => setStructureForm({...structureForm, tuitionFee: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                 <label className="text-xs font-medium text-neutral-500">Exam Fee (₹)</label>
                 <input type="number" required min="0" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.examFee || ''} onChange={e => setStructureForm({...structureForm, examFee: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                 <label className="text-xs font-medium text-neutral-500">Library Fee (₹)</label>
                 <input type="number" required min="0" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.libraryFee || ''} onChange={e => setStructureForm({...structureForm, libraryFee: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                 <label className="text-xs font-medium text-neutral-500">Laboratory Fee (₹)</label>
                 <input type="number" required min="0" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={structureForm.laboratoryFee || ''} onChange={e => setStructureForm({...structureForm, laboratoryFee: Number(e.target.value)})} />
                </div>
             </div>
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsStructureModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={savingStructure} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {savingStructure ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Structure
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Fees">
        <form onSubmit={handleAssignFee} className="space-y-4">
           <div className="space-y-1">
             <label className="text-xs font-medium text-neutral-500">Fee Structure</label>
             <select required className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.feeStructureId} onChange={e => setAssignForm({...assignForm, feeStructureId: e.target.value})}>
               <option value="">Select Structure</option>
               {feeStructures.map(f => <option key={f.id} value={f.id}>{f.academicYear} - {f.department || 'All'} - Total: ₹{f.totalFee}</option>)}
             </select>
           </div>
           <div className="space-y-1">
             <label className="text-xs font-medium text-neutral-500">Target Type</label>
             <select required className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.target} onChange={e => setAssignForm({...assignForm, target: e.target.value})}>
               <option value="student">Individual Student</option>
               <option value="department">Entire Department</option>
               <option value="year">Entire Year</option>
               <option value="class">Specific Class (Dept + Year)</option>
             </select>
           </div>
           
           {assignForm.target === 'student' && (
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Student</label>
               <select required className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.studentId} onChange={e => setAssignForm({...assignForm, studentId: e.target.value})}>
                 <option value="">Select Student</option>
                 {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>)}
               </select>
             </div>
           )}

           {(assignForm.target === 'department' || assignForm.target === 'class') && (
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Department</label>
               <select required className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.department} onChange={e => setAssignForm({...assignForm, department: e.target.value})}>
                 <option value="">Select Dept</option>
                 {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
               </select>
             </div>
           )}

           {(assignForm.target === 'year' || assignForm.target === 'class') && (
             <div className="space-y-1">
               <label className="text-xs font-medium text-neutral-500">Year</label>
               <select required className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.year} onChange={e => setAssignForm({...assignForm, year: e.target.value})}>
                 <option value="">Select Year</option>
                 <option value="1st Year">1st Year</option>
                 <option value="2nd Year">2nd Year</option>
                 <option value="3rd Year">3rd Year</option>
                 <option value="4th Year">4th Year</option>
               </select>
             </div>
           )}

           <div className="space-y-1">
             <label className="text-xs font-medium text-neutral-500">Due Date</label>
             <input required type="date" className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={assignForm.dueDate} onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} />
           </div>

           <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={assigningLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {assigningLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Assign Fee
            </button>
          </div>
        </form>
      </Modal>

      {/* View More Fees Modal */}
      <Modal isOpen={!!viewStudentFeeId} onClose={() => setViewStudentFeeId(null)} title="Detailed Fee Breakdown">
        {viewStudentFeeId && (
          <div className="space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl mb-4">
               <p className="font-bold text-lg text-indigo-900 dark:text-indigo-200">{getStudentInfo(viewStudentFeeId)?.fullName}</p>
               <p className="text-sm text-indigo-700 dark:text-indigo-300">{getStudentInfo(viewStudentFeeId)?.studentId} • {getStudentInfo(viewStudentFeeId)?.department} - {getStudentInfo(viewStudentFeeId)?.year}</p>
            </div>
            
            <div className="space-y-3">
              {groupedStudentFees[viewStudentFeeId].fees.map(fee => {
                const fs = feeStructures.find(s => s.id === fee.feeStructureId);
                return (
                  <div key={fee.id} className="p-4 border rounded-xl dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-neutral-200">Academic Year: {fs?.academicYear}</p>
                        <p className="text-xs text-gray-500">Due Date: {fee.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600">₹{fee.totalFee.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t dark:border-neutral-800">
                       <div>
                         <span className="text-gray-500 text-xs font-bold uppercase block mb-1">Paid Amount</span>
                         <span className="text-green-600 font-semibold">₹{fee.paidAmount.toLocaleString()}</span>
                       </div>
                       <div>
                         <span className="text-gray-500 text-xs font-bold uppercase block mb-1">Pending Amount</span>
                         <span className="text-red-600 font-semibold">₹{fee.pendingAmount.toLocaleString()}</span>
                       </div>
                    </div>
                    
                    {fs && (
                       <div className="mt-4 bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg text-xs space-y-1">
                          <p className="font-bold text-gray-600 dark:text-neutral-400 mb-2 uppercase tracking-wider text-[10px]">Structure Breakdown</p>
                          <div className="flex justify-between"><span>Tuition:</span> <span>₹{fs.tuitionFee}</span></div>
                          <div className="flex justify-between"><span>Exam:</span> <span>₹{fs.examFee}</span></div>
                          <div className="flex justify-between"><span>Library:</span> <span>₹{fs.libraryFee}</span></div>
                          <div className="flex justify-between"><span>Lab:</span> <span>₹{fs.laboratoryFee}</span></div>
                          <div className="flex justify-between"><span>Development:</span> <span>₹{fs.developmentFee}</span></div>
                          <div className="flex justify-between"><span>Other:</span> <span>₹{fs.otherCharges}</span></div>
                       </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t dark:border-neutral-800">
              <button type="button" onClick={() => setViewStudentFeeId(null)} className="px-6 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition">
                Back
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
