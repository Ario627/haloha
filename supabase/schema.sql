-- Supabase Database Schema for UMKM Consultant Platform
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('retail', 'fnb', 'jasa', 'manufaktur', 'pertanian', 'lainnya')),
  description TEXT,
  monthly_revenue DECIMAL(15, 2),
  monthly_expenses DECIMAL(15, 2),
  employee_count INTEGER,
  years_in_operation DECIMAL(5, 2),
  location TEXT,
  challenges TEXT[],
  goals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue records table for analytics
CREATE TABLE IF NOT EXISTS public.revenue_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense records table for analytics
CREATE TABLE IF NOT EXISTS public.expense_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bahan_baku', 'gaji', 'sewa', 'listrik', 'transport', 'marketing', 'lainnya')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultation sessions table
CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  topic TEXT DEFAULT 'umum',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_business_id ON public.revenue_records(business_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_date ON public.revenue_records(date);
CREATE INDEX IF NOT EXISTS idx_expense_records_business_id ON public.expense_records(business_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_date ON public.expense_records(date);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_user_id ON public.consultation_sessions(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Users can view their own businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses"
  ON public.businesses FOR DELETE
  USING (auth.uid() = user_id);

-- Revenue records policies
CREATE POLICY "Users can view their own revenue records"
  ON public.revenue_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = revenue_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create revenue records for their businesses"
  ON public.revenue_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = revenue_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own revenue records"
  ON public.revenue_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = revenue_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own revenue records"
  ON public.revenue_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = revenue_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

-- Expense records policies
CREATE POLICY "Users can view their own expense records"
  ON public.expense_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = expense_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expense records for their businesses"
  ON public.expense_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = expense_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own expense records"
  ON public.expense_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = expense_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own expense records"
  ON public.expense_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = expense_records.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

-- Consultation sessions policies
CREATE POLICY "Users can view their own consultation sessions"
  ON public.consultation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create consultation sessions"
  ON public.consultation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consultation sessions"
  ON public.consultation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consultation sessions"
  ON public.consultation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultation_sessions_updated_at
  BEFORE UPDATE ON public.consultation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
