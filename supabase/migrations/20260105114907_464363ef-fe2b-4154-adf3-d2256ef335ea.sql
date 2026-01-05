-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'supervisor');

-- Create profiles table for storing user profile data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT,
  faculty TEXT,
  department TEXT,
  programme TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create supervisor_students table for assigning supervisors to students
CREATE TABLE public.supervisor_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (supervisor_id, student_id)
);

-- Create logbook_entries table
CREATE TABLE public.logbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  activity_description TEXT NOT NULL,
  skills_learned TEXT,
  hours_worked NUMERIC(4,1) DEFAULT 8,
  challenges TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_needed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table for supervisor feedback
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.logbook_entries(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for file uploads
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('placement_letter', 'weekly_report', 'certificate', 'other')),
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, institution, faculty, department, programme)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'institution',
    NEW.raw_user_meta_data ->> 'faculty',
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'programme'
  );
  
  -- Also create role entry based on metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_logbook_entries_updated_at
  BEFORE UPDATE ON public.logbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Supervisors can view assigned students profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supervisor_students ss
      WHERE ss.supervisor_id = auth.uid() AND ss.student_id = profiles.id
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for supervisor_students
CREATE POLICY "Supervisors can view their assignments"
  ON public.supervisor_students FOR SELECT
  USING (supervisor_id = auth.uid() OR student_id = auth.uid());

-- RLS Policies for logbook_entries
CREATE POLICY "Students can view their own entries"
  ON public.logbook_entries FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create their own entries"
  ON public.logbook_entries FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own entries"
  ON public.logbook_entries FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Students can delete their own entries"
  ON public.logbook_entries FOR DELETE
  USING (student_id = auth.uid());

CREATE POLICY "Supervisors can view assigned students entries"
  ON public.logbook_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supervisor_students ss
      WHERE ss.supervisor_id = auth.uid() AND ss.student_id = logbook_entries.student_id
    )
  );

CREATE POLICY "Supervisors can update entries status"
  ON public.logbook_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.supervisor_students ss
      WHERE ss.supervisor_id = auth.uid() AND ss.student_id = logbook_entries.student_id
    )
  );

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their entries"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.logbook_entries le
      WHERE le.id = comments.entry_id AND le.student_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can view comments they made"
  ON public.comments FOR SELECT
  USING (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can create comments on assigned students entries"
  ON public.comments FOR INSERT
  WITH CHECK (
    supervisor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.logbook_entries le
      JOIN public.supervisor_students ss ON ss.student_id = le.student_id
      WHERE le.id = comments.entry_id AND ss.supervisor_id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upload their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Supervisors can view assigned students documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.supervisor_students ss
      WHERE ss.supervisor_id = auth.uid() AND ss.student_id = documents.user_id
    )
  );

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supervisors can view assigned students documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM public.supervisor_students ss
      WHERE ss.supervisor_id = auth.uid() AND ss.student_id::text = (storage.foldername(name))[1]
    )
  );