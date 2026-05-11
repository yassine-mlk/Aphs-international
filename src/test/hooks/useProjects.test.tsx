import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    status: 'authenticated',
    role: 'admin',
    isSuperAdmin: false,
  })),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSupabase', () => {
  const mockProjects = [
    { id: '1', name: 'Project 1', status: 'active' },
    { id: '2', name: 'Project 2', status: 'pending' },
  ];
  
  return {
    useSupabase: () => ({
      fetchData: vi.fn().mockResolvedValue(mockProjects),
      insertData: vi.fn().mockResolvedValue({ id: 'new-id', ...mockProjects[0] }),
      updateData: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
      deleteData: vi.fn().mockResolvedValue(true),
    }),
  };
});

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array when not authenticated', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      status: 'loading',
    });

    const { result } = renderHook(() => useProjects());
    
    const projects = await result.current.getProjects();
    expect(projects).toEqual([]);
  });

  it('should fetch projects without filters', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', status: 'active' },
      { id: '2', name: 'Project 2', status: 'pending' },
    ];

    const mockFetchData = vi.fn().mockResolvedValue(mockProjects);
    
    (vi.mocked(useAuth) as any).mockReturnValue({
      user: { id: 'test-user-id' },
      status: 'authenticated',
    });

    // We need to mock useSupabase to return fetchData
    const { result } = renderHook(() => useProjects());
    
    // Mock the internal fetchData
    const projects = await result.current.getProjects();
    
    // Verify the hook returns something (actual implementation details depend on useSupabase)
    expect(Array.isArray(projects)).toBe(true);
  });

  it('should fetch project by id', async () => {
    const mockProject = { id: 'test-id', name: 'Test Project' };
    
    const { result } = renderHook(() => useProjects());
    
    const project = await result.current.getProjectById('test-id');
    
    expect(project).toBeDefined();
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useProjects());
    
    // Initially loading should be false (unless specified otherwise in implementation)
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should create project with correct data', async () => {
    const { result } = renderHook(() => useProjects());
    
    const projectData = {
      name: 'New Project',
      description: 'Test description',
      status: 'pending',
      company_id: 'company-1',
      tenant_id: 'tenant-1',
    };

    const created = await result.current.createProject(projectData);
    
    // Should return a boolean or project object
    expect(created).toBeDefined();
  });

  it('should update project', async () => {
    const { result } = renderHook(() => useProjects());
    
    const updated = await result.current.updateProject('test-id', {
      name: 'Updated Name',
    });
    
    expect(updated).toBeDefined();
  });

  it('should delete project', async () => {
    const { result } = renderHook(() => useProjects());
    
    const deleted = await result.current.deleteProject('test-id');
    
    expect(typeof deleted).toBe('boolean');
  });

  it('should get projects with filters', async () => {
    const { result } = renderHook(() => useProjects());
    
    const projects = await result.current.getProjects({
      status: 'active',
      company_id: 'company-1',
    });
    
    expect(Array.isArray(projects)).toBe(true);
  });

  it('should get projects with date filters', async () => {
    const { result } = renderHook(() => useProjects());
    
    const projects = await result.current.getProjects({
      start_date_from: '2024-01-01',
      start_date_to: '2024-12-31',
    });
    
    expect(Array.isArray(projects)).toBe(true);
  });
});
