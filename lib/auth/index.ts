import { supabase } from '../db/client';

export type UserRole = 'operator_main' | 'operator_body' | 'owner';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  branchId: string | null;
}

const USERNAME_TO_EMAIL_MAP: Record<string, { email: string; role: UserRole; branchId: string | null }> = {
  elansary: {
    email: 'elansary@elansary-shop.com',
    role: 'owner',
    branchId: null,
  },
  main: {
    email: 'main@elansary-shop.com',
    role: 'operator_main',
    branchId: 'main-shop',
  },
  body: {
    email: 'body@elansary-shop.com',
    role: 'operator_body',
    branchId: 'body-shop',
  },
};

/**
 * Sign in with friendly username ("elansary", "main", or "body")
 */
export async function signInWithUsername(usernameInput: string, passwordInput: string) {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const mapped = USERNAME_TO_EMAIL_MAP[cleanUsername];

  const targetEmail = mapped ? mapped.email : cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@elansary-shop.com`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password: passwordInput,
  });

  if (error) {
    throw error;
  }

  // Retrieve user role from profiles table or metadata
  const user = data.user;
  if (!user) throw new Error('User authentication failed.');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const role: UserRole = profile?.role || (user.user_metadata?.role as UserRole) || mapped?.role || 'owner';
  const branchId: string | null = profile?.branch_id || (user.user_metadata?.branch_id as string) || mapped?.branchId || null;

  if (typeof window !== 'undefined') {
    localStorage.setItem('active_role', role);
    localStorage.setItem('active_username', cleanUsername);
  }

  return {
    user,
    session: data.session,
    role,
    branchId,
  };
}

/**
 * Sign out current session
 */
export async function signOutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('active_role');
    localStorage.removeItem('active_username');
  }
  await supabase.auth.signOut();
}

/**
 * Get active user session and role
 */
export async function getCurrentUserSession(): Promise<UserSession | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const user = session.user;
    let role: UserRole = (user.user_metadata?.role as UserRole) || 'owner';
    let branchId: string | null = (user.user_metadata?.branch_id as string) || null;

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile?.role) role = profile.role as UserRole;
      if (profile?.branch_id !== undefined) branchId = profile.branch_id;
    } catch (e) {
      console.warn('Could not fetch user profile from DB, falling back to metadata:', e);
    }

    const username = user.user_metadata?.username || (user.email ? user.email.split('@')[0] : 'user');

    return {
      id: user.id,
      email: user.email || '',
      username,
      role,
      branchId,
    };
  } catch (err) {
    console.error('Error fetching current user session:', err);
    return null;
  }
}

export function setSessionRole(role: UserRole) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('active_role', role);
  }
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const session = await getCurrentUserSession();
  if (session) return session.role;
  if (typeof window !== 'undefined') {
    const storedRole = localStorage.getItem('active_role') as UserRole;
    if (storedRole && ['operator_main', 'operator_body', 'owner'].includes(storedRole)) {
      return storedRole;
    }
  }
  return 'owner';
}
