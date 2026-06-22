import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Loader2, Calendar } from 'lucide-react';
import { Student, Attendance as AttendanceType } from '../types';

export default function Attendance() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setNotLinked(false);
    try {
      const allStudents = await mockDb.getStudents();
      allStudents.sort((a,b) => a.studentId.localeCompare(b.studentId));
      
      const allAttendances = await mockDb.getAttendances();
      const branchesData = await mockDb.getBranches();
      setBranches(branchesData);

      if (role === 'admin' || role === 'teacher') {
        setStudents(allStudents);
        setAttendances(allAttendances.filter(a => a.date === date));
      } else {
        const myStudent = allStudents.find(s => s.email === user?.email);
        if (!myStudent) {
          setNotLinked(true);
          return;
        }
        setAttendances(allAttendances.filter(a => a.studentId === myStudent.id).sort((a,b) => b.date.localeCompare(a.date)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role, user, date]);

  const handleMarkAttendance = async (studentDocId: string, status: 'Present' | 'Absent') => {
    setSavingId(studentDocId);
    try {
      await mockDb.addAttendance({
        studentId: studentDocId,
        date,
        status
      });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusForStudent = (studentId: string) => {
    return attendances.find(a => a.studentId === studentId)?.status;
  };

  if (loading && students.length === 0 && attendances.length === 0) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (notLinked) {
    return (
      <div className="flex flex-col items-center justify-center p-10 mt-10 text-center bg-white dark:bg-neutral-950 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Account Not Linked</h2>
        <p className="text-gray-500 dark:text-neutral-400">
          Your account ({user?.email}) is not yet linked to any student profile. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Attendance Management</h2>
        {(role === 'admin' || role === 'teacher') && (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-500" size={20} />
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 font-medium text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {(role === 'admin' || role === 'teacher') ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Year</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {students.filter(s => {
                  const matchBranch = selectedBranch ? s.department === selectedBranch : true;
                  const matchYear = selectedYear ? s.year === selectedYear : true;
                  return matchBranch && matchYear;
                }).map(student => {
                  const status = getStatusForStudent(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-neutral-400">{student.studentId}</td>
                      <td className="px-6 py-4 text-sm font-semibold">{student.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{student.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{student.year}</td>
                      <td className="px-6 py-4 text-sm">
                        {status ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${status === 'Present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-bold uppercase">Not marked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-4">
                        <button 
                          disabled={savingId === student.id || status === 'Present'}
                          onClick={() => handleMarkAttendance(student.id, 'Present')}
                          className="text-green-600 text-sm font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          Present
                        </button>
                        <button 
                          disabled={savingId === student.id || status === 'Absent'}
                          onClick={() => handleMarkAttendance(student.id, 'Absent')}
                          className="text-red-600 text-sm font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          Absent
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">My Attendance History</h3>
              <div className="space-y-4">
                {attendances.length === 0 ? (
                  <p className="text-neutral-500">No attendance records found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {attendances.map(record => (
                      <div key={record.id} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center text-sm font-medium">
                          <Calendar size={16} className="mr-2 text-neutral-400" />
                          {record.date}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
