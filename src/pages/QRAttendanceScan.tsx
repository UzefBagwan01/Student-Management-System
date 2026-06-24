import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import { mockDb } from '../lib/mockDb';
import { QRSession, Student, QRAttendance } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function QRAttendanceScan() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [myAttendances, setMyAttendances] = useState<QRAttendance[]>([]);
  
  const [scannedSession, setScannedSession] = useState<QRSession | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'duplicate' | 'expired'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Setup scanner inside useEffect
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;
    if (role === 'student' && student && scanStatus === 'idle') {
      try {
        html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            videoConstraints: {
              facingMode: "environment"
            }
          },
          /* verbose= */ false
        );
        html5QrcodeScanner.render(
          (decodedText, decodedResult) => {
            handleScan(decodedText);
          },
          (error) => {
            // we can ignore regular scanning errors since it errors every frame it doesn't find a code
          }
        );
      } catch (err) {
        console.error("Scanner init error:", err);
      }
    }
    
    return () => {
      if (html5QrcodeScanner) {
        try {
          html5QrcodeScanner.clear().catch(e => console.error(e));
        } catch (e) {}
      }
    };
  }, [role, student, scanStatus]);

  useEffect(() => {
    const init = async () => {
      try {
        if (role === 'student' && user?.email) {
          const students = await mockDb.getStudents();
          const me = students.find(s => s.email === user.email);
          if (me) {
            setStudent(me);
            const allSessions = await mockDb.getQRSessions();
            setSessions(allSessions);
            const atts = await mockDb.getQRAttendances();
            setMyAttendances(atts.filter(a => a.studentId === me.id));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [role, user]);

  if (role !== 'student' && role !== 'admin' && role !== 'teacher') return <Navigate to="/" />; // though meant for student, admins can view if they want maybe? Prompt says student scan page. Let's redirect admins? Wait, I added it to everyone. Let's just allow if student.
  if (role !== 'student') {
    return <div className="p-12 text-center text-gray-500 font-bold">Only students can scan attendance. <Navigate to="/qr-attendance" /></div>;
  }

  const isExpired = (session: QRSession) => {
    const endDateTimeStr = `${session.date}T${session.endTime}:00`;
    const endDateTime = new Date(endDateTimeStr).getTime();
    return Date.now() > endDateTime;
  };

  const handleScan = async (text: string) => {
    if (!text.startsWith('att_session:')) {
      setScanStatus('error');
      setErrorMessage('Invalid QR Code. Please scan a valid attendance QR.');
      return;
    }
    
    const sessionId = text.split(':')[1];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      setScanStatus('error');
      setErrorMessage('Attendance session not found or has been deleted.');
      return;
    }
    
    setScannedSession(session);
    
    if (isExpired(session)) {
      setScanStatus('expired');
      setErrorMessage('This attendance session has expired.');
      return;
    }
    
    // Check duplicate
    const alreadyMarked = myAttendances.some(a => a.sessionId === sessionId);
    if (alreadyMarked) {
      setScanStatus('duplicate');
      setErrorMessage('You have already marked attendance for this lecture.');
      return;
    }

    if (!student) return;

    // valid!
    try {
      const newAtt = await mockDb.addQRAttendance({
        sessionId: session.id,
        studentId: student.id,
        timestamp: Date.now()
      });
      setMyAttendances([...myAttendances, newAtt]);
      setScanStatus('success');
    } catch (e) {
      setScanStatus('error');
      setErrorMessage('Failed to save attendance record.');
    }
  };

  if (loading || !student) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  // History stats
  const totalMyLectures = myAttendances.length;
  // to get attendance % we would need to know total lectures for their dept/year.
  const applicableSessions = sessions.filter(s => s.department === student.department && s.year === student.year);
  const totalLectures = applicableSessions.length;
  const attPercent = totalLectures > 0 ? Math.round((totalMyLectures / totalLectures) * 100) : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Scan Attendance</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Scanner</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
               {scanStatus === 'idle' ? (
                 <div className="w-full max-w-md mx-auto">
                   <div id="qr-reader" className="w-full overflow-hidden rounded-xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm" />
                   <div className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center">
                     <ScanLine size={16} className="mr-2" /> Position the QR code within the frame to scan
                   </div>
                   <p className="mt-3 text-xs text-amber-600 dark:text-amber-500 text-center font-medium bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                     Note: If the camera does not open on your phone in preview, tap "Open in new tab" and ensure your browser has camera permissions.
                   </p>
                 </div>
               ) : scanStatus === 'success' ? (
                 <div className="text-center py-12 px-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Attendance Marked!</h3>
                    <p className="text-gray-500 mb-6 font-medium">Successfully recorded presence for <span className="text-indigo-600">{scannedSession?.subject}</span></p>
                    <div className="bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl p-4 text-left max-w-sm mx-auto mb-8">
                       <div className="text-sm border-b border-gray-200 dark:border-neutral-700 pb-2 mb-2">
                         <span className="text-gray-400">Lecture:</span> <span className="float-right font-semibold">{scannedSession?.lectureName}</span>
                       </div>
                       <div className="text-sm border-b border-gray-200 dark:border-neutral-700 pb-2 mb-2">
                         <span className="text-gray-400">Date:</span> <span className="float-right font-semibold">{scannedSession?.date}</span>
                       </div>
                       <div className="text-sm">
                         <span className="text-gray-400">Time:</span> <span className="float-right font-semibold">{new Date().toLocaleTimeString()}</span>
                       </div>
                    </div>
                    <button onClick={() => { setScanStatus('idle'); setScannedSession(null); }} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                      Scan Another
                    </button>
                 </div>
               ) : (
                 <div className="text-center py-12 px-6">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <XCircle size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Scan Failed</h3>
                    <p className="text-gray-500 mb-8 font-medium">{errorMessage}</p>
                    <button onClick={() => { setScanStatus('idle'); setScannedSession(null); setErrorMessage(''); }} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                      Try Again
                    </button>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>My Attendance History</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl text-center">
                   <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{attPercent}%</div>
                   <div className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 tracking-wider">Overall Rate</div>
                 </div>
                 <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-xl text-center">
                   <div className="text-2xl font-black text-green-600 dark:text-green-400">{totalMyLectures} / {totalLectures}</div>
                   <div className="text-[10px] uppercase font-bold text-green-800 dark:text-green-300 tracking-wider">Lectures Attended</div>
                 </div>
               </div>
               
               <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Records</h4>
               <div className="space-y-3">
                 {myAttendances.length === 0 ? (
                   <div className="text-center text-sm text-gray-400 py-4">No records found.</div>
                 ) : (
                   myAttendances.slice().sort((a,b) => b.timestamp - a.timestamp).map(a => {
                     const sess = sessions.find(s => s.id === a.sessionId);
                     return (
                       <div key={a.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-neutral-800 rounded-lg">
                         <div>
                           <div className="font-semibold text-sm">{sess?.subject || 'Unknown'}</div>
                           <div className="text-[10px] text-gray-500">{sess?.date} • {sess?.startTime}</div>
                         </div>
                         <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">Present</span>
                       </div>
                     );
                   })
                 )}
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
