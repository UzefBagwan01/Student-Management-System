import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Hardcoded Admin Login
      if (email === 'admin@college.com' && password === 'admin123') {
        const adminUser = { id: 'admin-local', email: 'admin@college.com' };
        localStorage.setItem('admin_auth', JSON.stringify({ user: adminUser, role: 'admin' }));
        setAuthData(adminUser, 'admin');
        navigate('/');
        return;
      }

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        setError('Signup successful! Check your email to verify your account.');
        // After verified, they can log in.
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          // Fallback for mock users created by admin without proper supabase auth
          const { data: students } = await supabase.from('students').select('*').eq('email', email);
          const { data: teachers } = await supabase.from('teachers').select('*').eq('email', email);
          
          if (students && students.length > 0 && password === 'student123') {
            const u = students[0];
            const mockUser = { id: u.user_id || u.id, email: u.email };
            localStorage.setItem('admin_auth', JSON.stringify({ user: mockUser, role: 'student' }));
            setAuthData(mockUser, 'student');
            navigate('/');
            return;
          } else if (teachers && teachers.length > 0 && password === 'teacher123') {
            const t = teachers[0];
            const mockUser = { id: t.user_id || t.id, email: t.email };
            localStorage.setItem('admin_auth', JSON.stringify({ user: mockUser, role: 'teacher' }));
            setAuthData(mockUser, 'teacher');
            navigate('/');
            return;
          }
          throw signInError;
        }
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first to reset password.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setResetSent(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] dark:bg-neutral-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto bg-indigo-600 p-3 rounded-xl w-16 h-16 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-8 h-8 text-white relative bottom-[2px]" />
            <span className="text-white font-bold text-xl absolute">S</span>
          </div>
          <CardTitle className="text-2xl mt-4">{isSignUp ? 'Create an Account' : 'Welcome Back'}</CardTitle>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {isSignUp ? 'Sign up to access your student portal' : 'Sign in to your account to continue'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 rounded-lg">
                Password reset email sent! Check your inbox.
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100"
                placeholder="admin@college.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
            <div className="text-center text-sm mt-4">
              <span className="text-gray-500 dark:text-neutral-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                {isSignUp ? 'Log in' : 'Sign up'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
