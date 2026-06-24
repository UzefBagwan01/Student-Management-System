-- Supabase Schema for Fee Management System
-- Clean, robust version without ENUMs to avoid "already exists" errors
-- All tables are public read/write so the mock Admin login can manage data freely.

-- 1. Profiles (Linked to auth.users for students/teachers, but not strictly required)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'student', 'teacher')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
EXCEPTION
    WHEN undefined_table THEN null; -- If auth.users doesn't exist in local dev
    WHEN duplicate_object THEN null;
END $$;

-- 2. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Optional link to auth.users
  teacher_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile_number TEXT,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Optional link to auth.users
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile_number TEXT,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  gender TEXT,
  address TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teacher Attendance
CREATE TABLE IF NOT EXISTS teacher_attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('Present', 'Absent')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Student Attendance (Manual)
CREATE TABLE IF NOT EXISTS attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('Present', 'Absent')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Marks
CREATE TABLE IF NOT EXISTS marks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  internal_marks NUMERIC NOT NULL,
  external_marks NUMERIC NOT NULL,
  total_marks NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. QR Sessions
CREATE TABLE IF NOT EXISTS qr_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  subject TEXT NOT NULL,
  lecture_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. QR Attendances
CREATE TABLE IF NOT EXISTS qr_attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES qr_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Fee Structure
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  tuition_fee NUMERIC NOT NULL,
  exam_fee NUMERIC NOT NULL,
  library_fee NUMERIC NOT NULL,
  laboratory_fee NUMERIC NOT NULL,
  development_fee NUMERIC NOT NULL,
  other_charges NUMERIC NOT NULL,
  total_fee NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Student Fee
CREATE TABLE IF NOT EXISTS student_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE RESTRICT,
  academic_year TEXT NOT NULL,
  total_fee NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  pending_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Fee Transactions
CREATE TABLE IF NOT EXISTS fee_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  amount_paid NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  status TEXT CHECK (status IN ('Success', 'Pending', 'Failed')) DEFAULT 'Pending',
  receipt_number TEXT UNIQUE NOT NULL
);

-- Open Access RLS Policies 
-- (This ensures the Admin and all users can interact with the data since Admin bypasses Supabase Auth)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON profiles;
CREATE POLICY "Allow all" ON profiles FOR ALL USING (true);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON students;
CREATE POLICY "Allow all" ON students FOR ALL USING (true);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON teachers;
CREATE POLICY "Allow all" ON teachers FOR ALL USING (true);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON attendances;
CREATE POLICY "Allow all" ON attendances FOR ALL USING (true);

ALTER TABLE teacher_attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON teacher_attendances;
CREATE POLICY "Allow all" ON teacher_attendances FOR ALL USING (true);

ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON qr_sessions;
CREATE POLICY "Allow all" ON qr_sessions FOR ALL USING (true);

ALTER TABLE qr_attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON qr_attendances;
CREATE POLICY "Allow all" ON qr_attendances FOR ALL USING (true);

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON fee_structures;
CREATE POLICY "Allow all" ON fee_structures FOR ALL USING (true);

ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON student_fees;
CREATE POLICY "Allow all" ON student_fees FOR ALL USING (true);

ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON fee_transactions;
CREATE POLICY "Allow all" ON fee_transactions FOR ALL USING (true);

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON marks;
CREATE POLICY "Allow all" ON marks FOR ALL USING (true);
