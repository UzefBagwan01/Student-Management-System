import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import { mockDb } from '../lib/mockDb';
import { QRSession, QRAttendance, Student } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Users, Search, Loader2 } from 'lucide-react';

export default function QRAttendanceAdmin() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'active' | 'reports'>('generate');
  
  // Data
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [attendances, setAttendances] = useState<QRAttendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [subject, setSubject] = useState('');
  const [lectureName, setLectureName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Current session being viewed
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Filters for reports
  const [reportDate, setReportDate] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportDepartment, setReportDepartment] = useState('');
  const [reportYear, setReportYear] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const b = await mockDb.getBranches();
      setBranches(b);
      const s = await mockDb.getStudents();
      setStudents(s);
      
      const sess = await mockDb.getQRSessions();
      const sortedSess = sess.sort((a,b) => b.createdAt - a.createdAt);
      setSessions(sortedSess);
      
      const att = await mockDb.getQRAttendances();
      setAttendances(att);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin' || role === 'teacher') {
      fetchData();
    }
  }, [role]);

  // Live updates for current session
  useEffect(() => {
    let interval: any;
    if (currentSessionId || activeTab === 'active' || activeTab === 'reports') {
      interval = setInterval(() => {
        mockDb.getQRAttendances().then(setAttendances);
        mockDb.getQRSessions().then(sess => setSessions(sess.sort((a,b) => b.createdAt - a.createdAt)));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentSessionId, activeTab]);

  if (role !== 'admin' && role !== 'teacher') return <Navigate to="/" />;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !year || !subject || !lectureName || !date || !startTime || !endTime) {
      alert("Please fill all fields");
      return;
    }
    // End time must be after start time, simplified validation here
    const s = await mockDb.addQRSession({
      department,
      year,
      subject,
      lectureName,
      date,
      startTime,
      endTime,
      createdAt: Date.now() // to calculate expiry later
    });
    setSessions([s, ...sessions]);
    setCurrentSessionId(s.id);
    setActiveTab('active');
    
    // Clear form
    setLectureName('');
    setSubject('');
  };

  const getSessionStudentCount = (sessionId: string) => {
    return attendances.filter(a => a.sessionId === sessionId).length;
  };

  const isExpired = (session: QRSession) => {
    // Parse the date and endTime. Format is YYYY-MM-DD and HH:mm
    const endDateTimeStr = `${session.date}T${session.endTime}:00`;
    const endDateTime = new Date(endDateTimeStr).getTime();
    return Date.now() > endDateTime;
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentSessionAttendances = attendances.filter(a => a.sessionId === currentSessionId);

  const getStudentInfo = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  // Report logic
  const filteredAttendances = attendances.filter(a => {
    const session = sessions.find(s => s.id === a.sessionId);
    if (!session) return false;
    
    if (reportDate && session.date !== reportDate) return false;
    if (reportSubject && !session.subject.toLowerCase().includes(reportSubject.toLowerCase())) return false;
    if (reportDepartment && session.department !== reportDepartment) return false;
    if (reportYear && session.year !== reportYear) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">QR Attendance System</h2>
      </div>

      <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'generate' ? 'bg-white dark:bg-neutral-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-neutral-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Monitor
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-white dark:bg-neutral-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Reports
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : activeTab === 'generate' ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Attendance Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Department</label>
                <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">Select Department</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Year</label>
                <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={year} onChange={e => setYear(e.target.value)}>
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Subject</label>
                <input required type="text" placeholder="e.g., Database Management" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Lecture Name / Topic</label>
                <input required type="text" placeholder="e.g., Normalization" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={lectureName} onChange={e => setLectureName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Date</label>
                <input required type="date" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Start Time</label>
                  <input required type="time" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">End Time (Expiry)</label>
                  <input required type="time" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              
              <div className="md:col-span-2 flex justify-end pt-4">
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition">
                  Create Session & Generate QR
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : activeTab === 'active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
              <CardContent className="px-0">
                <div className="max-h-[500px] overflow-y-auto w-full">
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No sessions available.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                      {sessions.map(s => {
                        const expired = isExpired(s);
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => setCurrentSessionId(s.id)}
                            className={`p-4 cursor-pointer transition-colors ${currentSessionId === s.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-gray-50 dark:hover:bg-neutral-800/50'}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-sm">{s.subject}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {expired ? 'Finished' : 'Active'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{s.department} - {s.year}</div>
                            <div className="text-xs text-gray-400 mt-2">{s.date} • {s.startTime} - {s.endTime}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            {currentSession ? (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0 bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64 w-64 flex items-center justify-center">
                       {isExpired(currentSession) ? (
                         <div className="text-center">
                           <div className="text-red-500 font-bold mb-2">QR Expired</div>
                           <p className="text-xs text-gray-500">The end time has passed for this lecture.</p>
                         </div>
                       ) : (
                         <QRCodeSVG 
                           value={`att_session:${currentSession.id}`} 
                           size={220}
                           level="H"
                           includeMargin={false}
                         />
                       )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold">{currentSession.subject}</h3>
                        <p className="text-gray-500">{currentSession.lectureName}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div>
                          <span className="block text-gray-400 text-xs">Department</span>
                          <span className="font-semibold">{currentSession.department}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 text-xs">Year</span>
                          <span className="font-semibold">{currentSession.year}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 text-xs">Time</span>
                          <span className="font-semibold">{currentSession.startTime} - {currentSession.endTime}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 text-xs">Date</span>
                          <span className="font-semibold">{currentSession.date}</span>
                        </div>
                      </div>

                      <div className="mt-8 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                         <div>
                            <span className="block text-indigo-800 dark:text-indigo-300 font-bold text-sm">Present Students</span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">Live attendance count</span>
                         </div>
                         <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {currentSessionAttendances.length}
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scanned Feed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentSessionAttendances.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">No students have scanned yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {currentSessionAttendances.slice().sort((a,b) => b.timestamp - a.timestamp).map(a => {
                          const s = getStudentInfo(a.studentId);
                          return (
                            <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                                  {s?.fullName?.substring(0,2).toUpperCase() || 'ST'}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">{s?.fullName}</div>
                                  <div className="text-xs text-gray-500">{s?.studentId}</div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 p-12 bg-white dark:bg-neutral-950 rounded-xl border border-gray-100 dark:border-neutral-800 border-dashed">
                Select a session from the list to view details and QR code.
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <CardTitle>Attendance Reports</CardTitle>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg dark:bg-neutral-900 dark:border-neutral-800" />
                <select value={reportDepartment} onChange={e => setReportDepartment(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg dark:bg-neutral-900 dark:border-neutral-800">
                  <option value="">All Depts</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                <select value={reportYear} onChange={e => setReportYear(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg dark:bg-neutral-900 dark:border-neutral-800">
                  <option value="">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
                <input type="text" placeholder="Subject..." value={reportSubject} onChange={e => setReportSubject(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg dark:bg-neutral-900 dark:border-neutral-800 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Student ID</th>
                      <th className="px-6 py-3">Subject</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {filteredAttendances.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">No records found for the selected filters.</td></tr>
                    ) : (
                      filteredAttendances.map(att => {
                        const sess = sessions.find(s => s.id === att.sessionId);
                        const stud = getStudentInfo(att.studentId);
                        if (!sess || !stud) return null;
                        return (
                          <tr key={att.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                            <td className="px-6 py-4 text-sm font-semibold">{stud.fullName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">{stud.studentId}</td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{sess.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{sess.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{sess.startTime} - {sess.endTime}</td>
                            <td className="px-6 py-4 text-sm"><span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-[10px] font-bold">Present</span></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
