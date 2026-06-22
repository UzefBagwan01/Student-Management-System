import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import { mockDb } from '../lib/mockDb';
import { StudentFee, FeeTransaction, FeeStructure } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Loader2, Download, CreditCard, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend window for razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StudentFees() {
  const { role, user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allStudents = await mockDb.getStudents();
      const me = allStudents.find(s => s.email === user?.email);
      if (me) {
        setStudentId(me.id);
        const sf = await mockDb.getStudentFees();
        setStudentFees(sf.filter(f => f.studentId === me.id));
        const tx = await mockDb.getFeeTransactions();
        setTransactions(tx.filter(t => t.studentId === me.id));
        const fs = await mockDb.getFeeStructures();
        setFeeStructures(fs);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'student') {
      fetchData();
      // load razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => { document.body.removeChild(script); }
    }
  }, [role]);

  if (role !== 'student') return <Navigate to="/" />;

  const handlePay = (fee: StudentFee) => {
    setPayingFeeId(fee.id);
    
    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded. Check connection.");
      setPayingFeeId(null);
      return;
    }

    const amountInPaise = fee.pendingAmount * 100;
    
    // Test Credentials from requirement
    const options = {
      key: 'rzp_test_T2MPwfljxi0Ydj',
      amount: amountInPaise,
      currency: "INR",
      name: "Student College Fees",
      description: `Paying ₹${fee.pendingAmount} for Fee Assignment`,
      handler: async function (response: any) {
        // Success
        try {
          // Update fee record
          await mockDb.updateStudentFee(fee.id, {
             paidAmount: fee.paidAmount + fee.pendingAmount,
             pendingAmount: 0,
             updatedAt: Date.now()
          });
          // Save transaction
          const receiptNum = 'REC/FEES/' + Math.floor(Math.random()*1000000);
          await mockDb.addFeeTransaction({
             studentFeeId: fee.id,
             studentId: studentId!,
             razorpayPaymentId: response.razorpay_payment_id,
             amountPaid: fee.pendingAmount,
             paymentDate: Date.now(),
             paymentMethod: 'Razorpay / Online',
             status: 'Success',
             receiptNumber: receiptNum
          });
          alert("Payment Successful!");
          fetchData();
        } catch (e) {
          console.error(e);
          alert("Payment recorded with error.");
        } finally {
          setPayingFeeId(null);
        }
      },
      prefill: {
        name: user?.email,
        email: user?.email,
      },
      theme: {
        color: "#4f46e5" // indigo-600
      },
      modal: {
        ondismiss: function() {
           setPayingFeeId(null);
        }
      }
    };
    
    const rzp1 = new window.Razorpay(options);
    rzp1.on('payment.failed', function (response: any){
      setPayingFeeId(null);
      alert("Payment Failed: " + response.error.description);
    });
    rzp1.open();
  };

  const generateReceipt = async (t: FeeTransaction) => {
    const fee = studentFees.find(f => f.id === t.studentFeeId);
    const fs = feeStructures.find(s => s.id === fee?.feeStructureId);
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo
    doc.text("COLLEGE FEE RECEIPT", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Receipt No: ${t.receiptNumber}`, 20, 35);
    doc.text(`Date: ${new Date(t.paymentDate).toLocaleDateString()}`, 150, 35);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Student Details:", 20, 50);
    doc.setFontSize(10);
    doc.text(`Email: ${user?.email}`, 20, 58);
    
    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Amount (INR)']],
      body: [
        [fs ? `${fs.academicYear} Total Fee Assignment` : 'Fee Payment', `Rs. ${t.amountPaid}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    // Transaction Details
    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.text("Payment Details:", 20, finalY + 15);
    doc.setFontSize(9);
    doc.text(`Payment ID: ${t.razorpayPaymentId || 'N/A'}`, 20, finalY + 22);
    doc.text(`Method: ${t.paymentMethod}`, 20, finalY + 28);
    doc.text(`Status: ${t.status}`, 20, finalY + 34);

    doc.text("Authorized Signature", 150, finalY + 50);

    doc.save(`${t.receiptNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">My Fee Dashboard</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Pending Dues</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {studentFees.filter(f => f.pendingAmount > 0).length === 0 ? (
                  <div className="text-center p-6 bg-green-50 text-green-700 rounded-xl font-medium">All dues are cleared.</div>
                ) : (
                  studentFees.filter(f => f.pendingAmount > 0).map(fee => {
                    const fs = feeStructures.find(s => s.id === fee.feeStructureId);
                    const isOverdue = new Date(fee.dueDate).getTime() < Date.now();
                    const percentPaid = fee.totalFee > 0 ? (fee.paidAmount / fee.totalFee) * 100 : 0;
                    
                    return (
                    <div key={fee.id} className="border border-gray-200 dark:border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                      {isOverdue && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl border-t border-r border-red-600">Overdue</div>}
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="text-lg font-bold">Academic Year: {fs?.academicYear}</h3>
                            <p className="text-sm text-gray-500">Due Date: {fee.dueDate}</p>
                         </div>
                         <div className="text-right">
                            <span className="block text-2xl font-black text-indigo-600">₹{fee.pendingAmount.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 font-medium tracking-wide">PENDING AMOUNT</span>
                         </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(percentPaid)}% Paid</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                          <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{width: `${percentPaid}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-4">
                         <div className="text-sm">
                           Total Fee: <span className="font-semibold text-gray-800 dark:text-neutral-200">₹{fee.totalFee.toLocaleString()}</span>
                         </div>
                         <button 
                           onClick={() => handlePay(fee)}
                           disabled={payingFeeId === fee.id}
                           className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-sm flex items-center transition-colors"
                         >
                           {payingFeeId === fee.id ? <Loader2 size={16} className="animate-spin mr-2"/> : <CreditCard size={16} className="mr-2"/>}
                           Pay Now
                         </button>
                      </div>

                      {fs && (
                         <div className="mt-4 bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg text-xs space-y-1">
                            <p className="font-bold text-gray-600 dark:text-neutral-400 mb-2 uppercase tracking-wider text-[10px]">Structure Breakdown</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div className="flex justify-between"><span>Tuition:</span> <span>₹{fs.tuitionFee}</span></div>
                              <div className="flex justify-between"><span>Exam:</span> <span>₹{fs.examFee}</span></div>
                              <div className="flex justify-between"><span>Library:</span> <span>₹{fs.libraryFee}</span></div>
                              <div className="flex justify-between"><span>Lab:</span> <span>₹{fs.laboratoryFee}</span></div>
                              <div className="flex justify-between"><span>Development:</span> <span>₹{fs.developmentFee}</span></div>
                              <div className="flex justify-between"><span>Other:</span> <span>₹{fs.otherCharges}</span></div>
                            </div>
                         </div>
                      )}
                    </div>
                  )})
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardContent>
                 <div className="space-y-3">
                   {transactions.length === 0 ? <p className="text-gray-500 text-sm">No payments made yet.</p> :
                     transactions.sort((a,b) => b.paymentDate - a.paymentDate).map(t => (
                       <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700/50 transition flex-wrap gap-4">
                         <div>
                            <div className="font-bold flex items-center gap-2">
                               <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                               ₹{t.amountPaid.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(t.paymentDate).toLocaleDateString()} • {t.receiptNumber}</div>
                         </div>
                         <div className="flex flex-col sm:flex-row items-center gap-3">
                            <span className="text-xs bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 px-2 py-1 rounded truncate max-w-[120px]">{t.paymentMethod}</span>
                            <button 
                              onClick={() => generateReceipt(t)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1"
                            >
                              Receipt <Download size={14}/>
                            </button>
                         </div>
                       </div>
                     ))
                   }
                 </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent>
                 <div className="space-y-4">
                   <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 tracking-wider">Total Fees</div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{studentFees.reduce((s,f) => s+f.totalFee, 0).toLocaleString()}</div>
                   </div>
                   <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-green-800 dark:text-green-300 tracking-wider">Total Paid</div>
                      <div className="text-2xl font-black text-green-600 dark:text-green-400">₹{studentFees.reduce((s,f) => s+f.paidAmount, 0).toLocaleString()}</div>
                   </div>
                   <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-red-800 dark:text-red-300 tracking-wider">Total Pending</div>
                      <div className="text-2xl font-black text-red-600 dark:text-red-400">₹{studentFees.reduce((s,f) => s+f.pendingAmount, 0).toLocaleString()}</div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
