import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { Teacher, TeacherAttendance } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Search, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';

export default function TeachersList() {
  const { role } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendances, setAttendances] = useState<TeacherAttendance[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getTeachers();
      data.sort((a,b) => a.teacherId.localeCompare(b.teacherId));
      setTeachers(data);
      const branchesData = await mockDb.getBranches();
      setBranches(branchesData);
      const attData = await mockDb.getTeacherAttendances();
      setAttendances(attData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin') fetchData();
  }, [role]);

  if (role !== 'admin') return <Navigate to="/" />;

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setFormData(teacher);
      setEditingId(teacher.id);
    } else {
      setFormData({
        teacherId: '', fullName: '', email: '', mobileNumber: '', department: ''
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
        await mockDb.updateTeacher(editingId, formData);
      } else {
        const newUser = await mockDb.addUser({email: formData.email!, password: 'teacher123'});
        const teacherData = { ...formData, userId: newUser?.id } as Omit<Teacher, 'id'>;
        await mockDb.addTeacher(teacherData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this teacher?")) {
      setIsDeleting(id);
      try {
        await mockDb.deleteTeacher(id);
        fetchData();
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const markAttendance = async (teacherId: string, status: 'Present' | 'Absent') => {
    try {
      const existing = attendances.find(a => a.teacherId === teacherId && a.date === date);
      if (!existing) {
        await mockDb.addTeacherAttendance({ teacherId, date, status });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatus = (teacherId: string) => {
    const record = attendances.find(a => a.teacherId === teacherId && a.date === date);
    return record?.status;
  };

  const filteredTeachers = teachers.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">Manage Teachers</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition text-sm font-bold"
          >
            <Plus size={18} className="mr-2" /> Add Teacher
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search by Name, ID, or Dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-3">Teacher ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Attendance</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No teachers found.</td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const status = getStatus(teacher.id);
                    return (
                    <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-neutral-400">{teacher.teacherId}</td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">{teacher.fullName.substring(0,2)}</div>
                          <div className="flex flex-col">
                            <span>{teacher.fullName}</span>
                            <span className="text-xs font-normal text-gray-500">{teacher.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-neutral-300">{teacher.department}</td>
                      <td className="px-6 py-4">
                        {status ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${status === 'Present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {status}
                          </span>
                        ) : (
                          <div className="flex space-x-2">
                            <button onClick={() => markAttendance(teacher.id, 'Present')} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded">P</button>
                            <button onClick={() => markAttendance(teacher.id, 'Absent')} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded">A</button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-4">
                        <button onClick={() => handleOpenModal(teacher)} className="text-indigo-600 text-sm font-bold hover:underline">
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.id)} 
                          disabled={isDeleting === teacher.id}
                          className="text-red-600 text-sm font-bold hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {isDeleting === teacher.id ? <Loader2 size={16} className="animate-spin inline" /> : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Teacher" : "Add New Teacher"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Teacher ID</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.teacherId || ''} onChange={e => setFormData({...formData, teacherId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Full Name</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Email Address (Login ID)</label>
              <input required type="email" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Mobile Number</label>
              <input required type="text" className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.mobileNumber || ''} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-neutral-500">Department</label>
              <select required className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-900 dark:border-neutral-700" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})}>
                <option value="">Select Department</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
            Note: Teachers login password will be generated as 'teacher123' by default when created via this portal.
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Teacher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
