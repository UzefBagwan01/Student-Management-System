import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Loader2, Download, Printer } from 'lucide-react';
import { Student, Attendance as AttendanceType, Mark } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router';

export default function Reports() {
  const { role } = useAuth();
  const [data, setData] = useState<{student: Student, attendancePercent: number, averageGrade: string}[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const students = await mockDb.getStudents();
        students.sort((a,b) => a.studentId.localeCompare(b.studentId));
        
        const attendances = await mockDb.getAttendances();
        const marks = await mockDb.getMarks();
        const branchesData = await mockDb.getBranches();
        setBranches(branchesData);

        const reportData = students.map(student => {
          // Calculate attendance
          const studentAtt = attendances.filter(a => a.studentId === student.id);
          const present = studentAtt.filter(a => a.status === 'Present').length;
          const attPercent = studentAtt.length > 0 ? Math.round((present / studentAtt.length) * 100) : 0;

          // Calculate marks
          const studentMarks = marks.filter(m => m.studentId === student.id);
          const totalMarks = studentMarks.reduce((sum, m) => sum + m.totalMarks, 0);
          const avgMarks = studentMarks.length > 0 ? totalMarks / studentMarks.length : 0;
          
          let grade = 'N/A';
          if (studentMarks.length > 0) {
            if (avgMarks >= 90) grade = 'A+';
            else if (avgMarks >= 80) grade = 'A';
            else if (avgMarks >= 70) grade = 'B';
            else if (avgMarks >= 60) grade = 'C';
            else grade = 'Fail';
          }

          return {
            student,
            attendancePercent: attPercent,
            averageGrade: grade
          };
        });

        setData(reportData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (role === 'admin') fetchData();
  }, [role]);

  if (role !== 'admin') return <Navigate to="/" />;

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const filteredData = data.filter(row => {
    const matchesBranch = selectedBranch ? row.student.department === selectedBranch : true;
    const matchesYear = selectedYear ? row.student.year === selectedYear : true;
    const matchesStudent = selectedStudentId ? row.student.id === selectedStudentId : true;
    return matchesBranch && matchesYear && matchesStudent;
  });

  const handleExportPDF = () => {
    const doc = new jsPDF() as any;
    let title = 'Student Comprehensive Report';
    if (selectedBranch) title += ` - ${selectedBranch}`;
    if (selectedYear) title += ` (${selectedYear})`;
    if (selectedStudentId) {
       const stud = filteredData[0]?.student.fullName;
       if (stud) title += ` [${stud}]`;
    }
    doc.text(title, 14, 15);
    
    const tableData = filteredData.map(row => [
      row.student.studentId,
      row.student.fullName,
      row.student.department,
      row.student.year,
      `${row.attendancePercent}%`,
      row.averageGrade
    ]);

    autoTable(doc, {
      head: [['ID', 'Name', 'Department', 'Year', 'Attendance', 'Grade']],
      body: tableData,
      startY: 20
    });
    
    doc.save(`Student_Report${selectedBranch ? '_'+selectedBranch : ''}.pdf`);
  };

  const handleExportExcel = () => {
    const wsData = filteredData.map(row => ({
      'Student ID': row.student.studentId,
      'Name': row.student.fullName,
      'Department': row.student.department,
      'Year': row.student.year,
      'Attendance %': row.attendancePercent,
      'Average Grade': row.averageGrade
    }));
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students Report");
    XLSX.writeFile(wb, `Student_Report${selectedBranch ? '_'+selectedBranch : ''}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">System Reports</h2>
          <div className="flex space-x-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition text-sm font-bold shadow-sm">
              <Printer size={18} className="mr-2" /> Print
            </button>
            <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-sm text-sm font-bold hover:bg-emerald-700 transition">
              <Download size={18} className="mr-2" /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm text-sm font-bold hover:bg-indigo-700 transition">
              <Download size={18} className="mr-2" /> PDF
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <select 
            value={selectedBranch}
            onChange={(e) => {
               setSelectedBranch(e.target.value);
               setSelectedStudentId('');
            }}
            className="py-2 px-4 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto min-w-[150px]"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => {
               setSelectedYear(e.target.value);
               setSelectedStudentId('');
            }}
            className="py-2 px-4 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto min-w-[150px]"
          >
            <option value="">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="py-2 px-4 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 w-full sm:flex-1 min-w-[200px]"
          >
            <option value="">All Students</option>
            {data
              .filter(s => selectedBranch ? s.student.department === selectedBranch : true)
              .filter(s => selectedYear ? s.student.year === selectedYear : true)
              .map(row => (
              <option key={row.student.id} value={row.student.id}>{row.student.fullName} ({row.student.studentId})</option>
            ))}
          </select>
        </div>
      </div>

      <Card id="printable-area">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3 text-right">Attendance %</th>
                  <th className="px-6 py-3 text-right">Overall Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {filteredData.map((row) => (
                  <tr key={row.student.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-neutral-400">{row.student.studentId}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{row.student.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{row.student.department} - {row.student.year}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.attendancePercent < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {row.attendancePercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-black text-gray-800 dark:text-neutral-100">{row.averageGrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Hide print styles directly here to affect only #printable-area */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}
      </style>
    </div>
  );
}
