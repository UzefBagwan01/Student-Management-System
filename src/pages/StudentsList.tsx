import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { Student } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Search, Plus, Edit2, Trash2, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import { StudentProfileView } from '../components/StudentProfileView';

export default function StudentsList() {
  const { role } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Student view
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [viewType, setViewType] = useState('overview');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getStudents();
      data.sort((a,b) => a.studentId.localeCompare(b.studentId));
      setStudents(data);
      const branchesData = await mockDb.getBranches();
      setBranches(branchesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin' || role === 'teacher') fetchStudents();
  }, [role]);

  if (role !== 'admin' && role !== 'teacher') return <Navigate to="/" />;

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setFormData(student);
      setEditingId(student.id);
    } else {
      setFormData({
        studentId: '', fullName: '', email: '', mobileNumber: '',
        department: '', year: '', gender: 'Male', address: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await mockDb.updateStudent(editingId, formData);
      } else {
        const newUser = await mockDb.addUser({email: formData.email!, password: 'student123'});
        const studentData = { 
          ...formData, 
          userId: newUser?.id,
          gender: formData.gender || 'Male'
        } as Omit<Student, 'id'>;
        await mockDb.addStudent(studentData);
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    setSaving(true);
    try {
      await mockDb.addBranch(newBranchName);
      setNewBranchName('');
      setIsBranchModalOpen(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      setIsDeleting(id);
      try {
        await mockDb.deleteStudent(id);
        fetchStudents();
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = selectedBranch ? s.department === selectedBranch : true;
    const matchesYear = selectedYear ? s.year === selectedYear : true;
    return matchesSearch && matchesBranch && matchesYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Manage Students</h2>
        {role === 'admin' && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl shadow-sm hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition text-sm font-bold"
            >
              <Plus size={18} className="mr-2" /> Add Section
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition text-sm font-bold"
            >
              <Plus size={18} className="mr-2" /> Add Student
            </button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search by Name, ID, or Dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="py-2 px-4 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="py-2 px-4 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
            >
              <option value="">All Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Year</th>
                  {role === 'admin' && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={role === 'admin' ? 5 : 4} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={role === 'admin' ? 5 : 4} className="px-6 py-10 text-center text-gray-500">No students found.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-neutral-400">{student.studentId}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{student.fullName.substring(0,2)}</div>
                          {student.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{student.department}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">{student.year}</span></td>
                      {role === 'admin' && (
                        <td className="px-6 py-4 text-right space-x-4">
                          <button onClick={() => setViewStudent(student)} className="text-gray-600 text-sm font-bold hover:underline">
                            View
                          </button>
                          <button onClick={() => handleOpenModal(student)} className="text-indigo-600 text-sm font-bold hover:underline">
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}  
                            disabled={isDeleting === student.id}
                            className="text-red-600 text-sm font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {isDeleting === student.id ? <Loader2 size={16} className="animate-spin inline" /> : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Student" : "Add New Student"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Student ID</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.studentId || ''} onChange={e => setFormData({...formData, studentId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Full Name</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Email Address</label>
              <input required type="email" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Mobile Number</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.mobileNumber || ''} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Department</label>
              <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})}>
                <option value="">Select Department</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Year</label>
              <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})}>
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Gender</label>
              <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.gender || 'Male'} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-neutral-500">Address</label>
              <textarea required rows={2} className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Student
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title="Manage Sections/Branches">
        <form onSubmit={handleAddBranch} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Branch Name (e.g. ENTC, Computer)</label>
            <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsBranchModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Add Section
            </button>
          </div>
        </form>
        <div className="mt-6">
          <h4 className="text-sm font-bold text-gray-700 dark:text-neutral-300 mb-2">Existing Branches</h4>
          <ul className="space-y-2">
            {branches.map(b => (
              <li key={b.id} className="flex justify-between items-center bg-gray-50 dark:bg-neutral-800 px-3 py-2 rounded-md">
                <span className="text-sm">{b.name}</span>
                <button onClick={async () => {
                   if(window.confirm("Delete branch?")) {
                      await mockDb.deleteBranch(b.id);
                      fetchStudents();
                   }
                }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </li>
            ))}
            {branches.length === 0 && <li className="text-xs text-gray-500">No branches added yet.</li>}
          </ul>
        </div>
      </Modal>

      <Modal isOpen={!!viewStudent} onClose={() => setViewStudent(null)} title="Student Profile">
        {viewStudent && <StudentProfileView student={viewStudent} onClose={() => setViewStudent(null)} />}
      </Modal>
    </div>
  );
}
