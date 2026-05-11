import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';

// Mock data
const mockTenant = {
  id: 'tenant-1',
  name: 'Test Tenant',
  slug: 'test-tenant',
  owner_email: 'owner@test.com',
  owner_user_id: 'owner-id',
  plan: 'pro',
  max_projects: 20,
  max_intervenants: 50,
  max_storage_gb: 50,
  current_projects_count: 5,
  current_intervenants_count: 10,
  current_storage_used_bytes: 1024 * 1024 * 100, // 100MB
  status: 'active',
  trial_ends_at: null,
  subscription_starts_at: null,
  subscription_ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  settings: {},
};

const mockMember = {
  id: 'member-1',
  tenant_id: 'tenant-1',
  user_id: 'test-user-id',
  role: 'admin',
  invited_by: null,
  invited_at: null,
  joined_at: new Date().toISOString(),
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tenant: mockTenant,
};

// Mock supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockMember],
          error: null,
        }),
        single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
      },
    },
  };
});

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    status: 'authenticated',
    role: 'admin',
    isSuperAdmin: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TenantProvider>{children}</TenantProvider>
  );

  it('should handle loading state', () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    // Initially tenant might be null or loading
    expect(result.current).toHaveProperty('tenant');
    expect(result.current).toHaveProperty('isLoading');
  });

  it('should eventually load tenant data', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.tenant).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.tenant?.name).toBe('Test Tenant');
  });

  it('should have canAddProject function', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.tenant).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(typeof result.current.canAddProject).toBe('function');
    expect(result.current.canAddProject()).toBe(true); // 5 < 20
  });

  it('should have canAddIntervenant function', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.tenant).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(typeof result.current.canAddIntervenant).toBe('function');
    expect(result.current.canAddIntervenant()).toBe(true); // 10 < 50
  });

  it('should have canUploadFile function', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.tenant).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(typeof result.current.canUploadFile).toBe('function');
    const fileSize = 1024 * 1024; // 1MB
    expect(result.current.canUploadFile(fileSize)).toBe(true);
  });

  it('should calculate usage correctly', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.tenant).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(result.current.usage).not.toBeNull();
    expect(result.current.usage.projects.used).toBe(5);
    expect(result.current.usage.projects.limit).toBe(20);
    expect(result.current.usage.intervenants.used).toBe(10);
    expect(result.current.usage.intervenants.limit).toBe(50);
  });
});
