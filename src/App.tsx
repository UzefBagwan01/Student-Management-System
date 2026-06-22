import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import TeachersList from './pages/TeachersList';
import Attendance from './pages/Attendance';
import QRAttendanceAdmin from './pages/QRAttendanceAdmin';
import QRAttendanceScan from './pages/QRAttendanceScan';
import FeeManagementAdmin from './pages/FeeManagementAdmin';
import StudentFees from './pages/StudentFees';
import Marks from './pages/Marks';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="students" element={<StudentsList />} />
        <Route path="teachers" element={<TeachersList />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="qr-attendance" element={<QRAttendanceAdmin />} />
        <Route path="qr-scan" element={<QRAttendanceScan />} />
        <Route path="marks" element={<Marks />} />
        <Route path="fees" element={<FeeManagementAdmin />} />
        <Route path="my-fees" element={<StudentFees />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
