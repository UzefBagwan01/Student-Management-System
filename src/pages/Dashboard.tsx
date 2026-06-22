import React, { useEffect, useState } from 'react';
import { mockDb } from '../lib/mockDb';
import { useAuth } from '../hooks/useAuth';
import { Users, BookOpen, CheckCircle, Award, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    attendancePercent: 0,
    totalResults: 0,
  });
  const [notLinked, setNotLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        let studentsSnap = await mockDb.getStudents();
        let attendanceSnap = await mockDb.getAttendances();
        let marksSnap = await mockDb.getMarks();
        
        let qrAttendancesSnap = await mockDb.getQRAttendances();

        if (role !== 'admin' && role !== 'teacher') {
          // Student gets their own stats
          const myStudent = studentsSnap.find(s => s.email === user?.email);
          if (!myStudent) {
            setNotLinked(true);
            setLoading(false);
            return;
          }
          studentsSnap = [myStudent];
          attendanceSnap = attendanceSnap.filter(a => a.studentId === myStudent.id);
          qrAttendancesSnap = qrAttendancesSnap.filter(a => a.studentId === myStudent.id);
          marksSnap = marksSnap.filter(m => m.studentId === myStudent.id);
        }

        const totalStudents = studentsSnap.length;
        const totalResults = marksSnap.length;
        
        // Calculate unique courses/subjects from marks
        const subjects = new Set();
        marksSnap.forEach(doc => subjects.add(doc.subjectName));
        const totalCourses = subjects.size || 5; // Default if empty

        // Calculate attendance combining both manual and QR attendance
        let presentCount = 0;
        let totalAttendance = attendanceSnap.length;
        attendanceSnap.forEach(doc => {
          if (doc.status === 'Present') presentCount++;
        });

        // Add QR attendance
        presentCount += qrAttendancesSnap.length;
        
        // Find total QR lectures (all sessions or matching user sessions)
        let qrSessions = await mockDb.getQRSessions();
        if (role !== 'admin' && role !== 'teacher') {
          const myStudent = studentsSnap[0];
          const applicableQrSessions = qrSessions.filter(s => s.department === myStudent.department && s.year === myStudent.year);
          totalAttendance += applicableQrSessions.length;
        } else {
           // approximation for admin stats: 1 session = 1 total lecture opportunity * num students? 
           // That might skew things. For simplicity, just add total QR sessions to total opportunity for admin? No, let's keep logic simpler:
           // Attendance percent across ALL records. For admin, total records = manual + (QR sessions * total eligible students).
           // It's easier just to approximate. Let's say all qrAttendances are Present. Then just don't heavily change totalAttendance, but add it to both or approximate.
           // Better approximation for admin dashboard: 
           let totalEligibleQrScans = 0;
           for(let s of qrSessions) {
              const eligible = studentsSnap.filter(stud => stud.department === s.department && stud.year === s.year).length;
              totalEligibleQrScans += eligible;
           }
           totalAttendance += totalEligibleQrScans;
        }

        const attendancePercent = totalAttendance === 0 ? 0 : Math.round((presentCount / totalAttendance) * 100);

        setStats({
          totalStudents,
          totalCourses,
          attendancePercent,
          totalResults
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      fetchStats();
    }
  }, [role, user]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (notLinked) {
    return (
      <div className="flex flex-col items-center justify-center p-10 mt-10 text-center bg-white dark:bg-neutral-950 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center rounded-full mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Account Not Linked</h2>
        <p className="text-gray-500 dark:text-neutral-400">
          Your account ({user?.email}) is not yet linked to any student profile. Please contact your administrator to add your email to the student records.
        </p>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Active Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { title: 'Attendance', value: `${stats.attendancePercent}%`, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { title: 'Results', value: stats.totalResults, icon: Award, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  const chartData = [
    { name: 'CS', students: (role === 'admin' || role === 'teacher') ? 120 : 1 },
    { name: 'IT', students: (role === 'admin' || role === 'teacher') ? 90 : 0 },
    { name: 'ECE', students: (role === 'admin' || role === 'teacher') ? 60 : 0 },
    { name: 'ME', students: (role === 'admin' || role === 'teacher') ? 80 : 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-100 hidden sm:block">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.title}</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-black text-gray-800 dark:text-neutral-100">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(role === 'admin' || role === 'teacher') && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">Department Distribution (Demo)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
