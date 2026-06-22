import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockDb';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Loader2, Mail, Phone, MapPin, Building, GraduationCap, Calendar } from 'lucide-react';
import { Student } from '../types';

export default function Profile() {
  const { role, user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (role === 'admin') {
        setLoading(false);
        return;
      }

      if (user?.email) {
        try {
          const students = await mockDb.getStudents();
          const found = students.find(s => s.email === user.email);
          if (found) {
            setStudent(found);
          }
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [role, user]);

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (role === 'admin') {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
              A
            </div>
            <h2 className="text-2xl font-bold">System Administrator</h2>
            <p className="text-neutral-500 mt-2">{user?.email}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Profile Not Found</h2>
        <p className="text-neutral-500">Your email has not been linked to any student record by the administrator.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Student Profile</h2>
      
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="w-32 h-32 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden shadow-inner border-4 border-white dark:border-neutral-800">
                {student.fullName.charAt(0)}
              </div>
              <span className="mt-4 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-sm font-medium rounded-full">
                ID: {student.studentId}
              </span>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{student.fullName}</h3>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center mt-1">
                  <GraduationCap className="w-4 h-4 mr-2" /> {student.department} - {student.year}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center text-sm">
                  <Mail className="w-5 h-5 mr-3 text-neutral-400" />
                  <span className="max-w-full truncate">{student.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="w-5 h-5 mr-3 text-neutral-400" />
                  {student.mobileNumber}
                </div>
                <div className="flex items-center text-sm">
                  <Building className="w-5 h-5 mr-3 text-neutral-400" />
                  {student.department}
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="w-5 h-5 mr-3 text-neutral-400" />
                  {student.year}
                </div>
                <div className="flex items-center text-sm sm:col-span-2">
                  <MapPin className="w-5 h-5 mr-3 text-neutral-400" />
                  {student.address}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
