import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock window.setTimeout and clearTimeout
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    // Keep the actual hook but we'll wrap it in our test
  };
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should have initial status "loading"', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('should sign in successfully', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const signInResult = await result.current.signIn('test@example.com', 'password');
    
    expect(signInResult.user).toEqual(mockUser);
    expect(signInResult.error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle sign in error', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const signInResult = await result.current.signIn('test@example.com', 'wrong-password');
    
    expect(signInResult.user).toBeNull();
    expect(signInResult.error).toBeInstanceOf(Error);
  });

  it('should sign out successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await result.current.signOut();
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should update status on auth state change', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    let authStateCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } }
      };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Simulate auth state change
    await waitFor(() => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', mockSession);
      }
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).toEqual(mockUser);
  });
});
