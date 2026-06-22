import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Loader2, Plus } from 'lucide-react';
import { Student, Mark } from '../types';

const calculateGrade = (total: number) => {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  return 'Fail';
};

export default function Marks() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notLinked, setNotLinked] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const [formData, setFormData] = useState({
    studentId: '', // student's doc ID
    subjectName: '',
    internalMarks: '',
    externalMarks: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setNotLinked(false);
    try {
      const allStudents = await mockDb.getStudents();
      allStudents.sort((a,b) => a.studentId.localeCompare(b.studentId));
      
      const allMarks = await mockDb.getMarks();
      const branchesData = await mockDb.getBranches();
      setBranches(branchesData);

      if (role === 'admin' || role === 'teacher') {
        setStudents(allStudents);
        setMarks(allMarks);
      } else {
        const myStudent = allStudents.find(s => s.email === user?.email);
        if (!myStudent) {
          setNotLinked(true);
          return;
        }
        setMarks(allMarks.filter(m => m.studentId === myStudent.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const intMarks = Number(formData.internalMarks);
    const extMarks = Number(formData.externalMarks);
    const total = intMarks + extMarks;
    const grade = calculateGrade(total);

    try {
      await mockDb.addMark({
        studentId: formData.studentId,
        subjectName: formData.subjectName,
        internalMarks: intMarks,
        externalMarks: extMarks,
        totalMarks: total,
        grade
      });
      setIsModalOpen(false);
      setFormData({ studentId: '', subjectName: '', internalMarks: '', externalMarks: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.fullName || 'Unknown Student';
  };

  if (loading && students.length === 0 && marks.length === 0) {
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
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Marks Management</h2>
        {(role === 'admin' || role === 'teacher') && (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
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
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition text-sm font-bold"
            >
              <Plus size={18} className="mr-2" /> Add Marks
            </button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  {(role === 'admin' || role === 'teacher') && <th className="px-6 py-3">Student Name</th>}
                  {(role === 'admin' || role === 'teacher') && <th className="px-6 py-3">Department</th>}
                  {(role === 'admin' || role === 'teacher') && <th className="px-6 py-3">Year</th>}
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3 text-right">Internal</th>
                  <th className="px-6 py-3 text-right">External</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {marks.length === 0 ? (
                  <tr>
                    <td colSpan={(role === 'admin' || role === 'teacher') ? 8 : 5} className="px-6 py-10 text-center text-gray-500">No marks found.</td>
                  </tr>
                ) : (
                  marks.filter(mark => {
                    if (role !== 'admin' && role !== 'teacher') return true;
                    const student = students.find(s => s.id === mark.studentId);
                    if (!student) return false;
                    const matchBranch = selectedBranch ? student.department === selectedBranch : true;
                    const matchYear = selectedYear ? student.year === selectedYear : true;
                    return matchBranch && matchYear;
                  }).map((mark) => (
                    <tr key={mark.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      {(role === 'admin' || role === 'teacher') && <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-neutral-300">{getStudentName(mark.studentId)}</td>}
                      {(role === 'admin' || role === 'teacher') && <td className="px-6 py-4 text-sm text-gray-500">{students.find(s => s.id === mark.studentId)?.department}</td>}
                      {(role === 'admin' || role === 'teacher') && <td className="px-6 py-4 text-sm text-gray-500">{students.find(s => s.id === mark.studentId)?.year}</td>}
                      <td className="px-6 py-4 text-sm font-semibold">{mark.subjectName}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-500">{mark.internalMarks}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-500">{mark.externalMarks}</td>
                      <td className="px-6 py-4 text-sm text-right font-black text-gray-800 dark:text-neutral-200">{mark.totalMarks}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                          mark.grade === 'Fail' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {mark.grade.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Student Marks">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-500">Select Student</label>
            <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700 text-sm" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}>
              <option value="">-- Choose --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.studentId} - {s.fullName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-500">Subject Name</label>
            <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700 text-sm" value={formData.subjectName} onChange={e => setFormData({...formData, subjectName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-500">Internal Marks</label>
              <input required type="number" min="0" max="100" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700 text-sm" value={formData.internalMarks} onChange={e => setFormData({...formData, internalMarks: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-500">External Marks</label>
              <input required type="number" min="0" max="100" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700 text-sm" value={formData.externalMarks} onChange={e => setFormData({...formData, externalMarks: e.target.value})} />
            </div>
          </div>
          
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center text-sm">
            <span className="text-neutral-500">Total Calculated:</span>
            <span className="font-bold text-lg">
              {(Number(formData.internalMarks || 0) + Number(formData.externalMarks || 0)) || 0}
            </span>
          </div>

          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:bg-neutral-800 dark:text-neutral-300">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Marks
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
