import { createContext, useContext, useState, ReactNode } from 'react';
import { AuthState, User } from '../types';
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('inventaris_user');
    return stored ? JSON.parse(stored) : null;
  });
  const login = (token: string, username: string, name: string, role: string): boolean => {
    const u: any = {
      id: username,
      username,
      name,
      role,
      token
    };
    setUser(u);
    localStorage.setItem('inventaris_user', JSON.stringify(u));
    return true;
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('inventaris_user');
  };
  return <AuthContext.Provider value={{
    user,
    isAuthenticated: !!user,
    login,
    logout
  }}>
      {children}
    </AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}