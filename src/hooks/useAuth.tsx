import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type UserRole = "student" | "supervisor" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  institution: string | null;
  faculty: string | null;
  department: string | null;
  programme: string | null;
  avatar_url: string | null;
}

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  institution_id: string;
  faculty: string;
  department: string;
  programme: string;
  role: UserRole;
  supervisor_id?: string; // Required for students
  staff_id?: string; // Required for supervisors
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData) {
      setRole(roleData.role as UserRole);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Keep loading true until role/profile are fetched so route guards
          // don't redirect prematurely (role would be null otherwise).
          setLoading(true);
          setTimeout(() => {
            fetchUserData(session.user.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const signUp = async (data: SignUpData): Promise<{ error: Error | null }> => {
    const redirectUrl = `${APP_URL}/`;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.full_name,
          institution_id: data.institution_id,
          faculty: data.faculty,
          department: data.department,
          programme: data.programme,
          role: data.role,
          staff_id: data.staff_id,
        },
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // Log institution registration to audit table
    if (authData.user) {
      try {
        await supabase.from("institution_audit_log").insert({
          user_id: authData.user.id,
          institution_id: data.institution_id,
          user_type: data.role,
          email: data.email,
          full_name: data.full_name,
          faculty: data.faculty,
          department: data.department,
          programme: data.programme,
          staff_id: data.staff_id || null,
        });
      } catch (auditError) {
        console.error("[v0] Error logging institution registration:", auditError);
        // Don't fail signup if audit logging fails
      }
    }

    // If student, assign to supervisor after successful signup
    if (data.role === "student" && data.supervisor_id && authData.user) {
      const { error: assignError } = await supabase.rpc("assign_student_to_supervisor", {
        _student_id: authData.user.id,
        _supervisor_id: data.supervisor_id,
      });

      if (assignError) {
        console.error("[v0] Error assigning supervisor:", assignError);
        // Don't fail signup, but log the error - admin can fix later
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/reset-password`,
    });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
