import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactForm } from '@/hooks/useContactForm';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('useContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    vi.stubEnv('VITE_RESEND_API_KEY', 'test-api-key');
  });

  it('initializes with empty form data', () => {
    const { result } = renderHook(() => useContactForm());
    
    expect(result.current.formData).toEqual({
      nom: '',
      prenom: '',
      email: '',
      entreprise: '',
      message: ''
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('updates form data on input change', () => {
    const { result } = renderHook(() => useContactForm());
    
    act(() => {
      result.current.handleInputChange({
        target: { name: 'nom', value: 'Test Nom' }
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.formData.nom).toBe('Test Nom');
  });

  it('validates required fields', async () => {
    const { result } = renderHook(() => useContactForm());
    
    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const form = new Event('submit', { cancelable: true });
    
    // Test with empty form
    await act(async () => {
      await result.current.handleSubmit(form);
    });
    
    // Should not call API if validation fails
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits valid form successfully', async () => {
    const { result } = renderHook(() => useContactForm());
    
    // Fill form with valid data
    act(() => {
      result.current.handleInputChange({
        target: { name: 'nom', value: 'Doe' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'prenom', value: 'John' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'email', value: 'john@example.com' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'message', value: 'Test message with enough characters' }
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    const form = new Event('submit', { cancelable: true });
    
    await act(async () => {
      await result.current.handleSubmit(form);
    });
    
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key'
      },
      body: expect.stringContaining('John Doe')
    });

    // Check if form is reset after successful submission
    expect(result.current.formData.nom).toBe('');
    expect(result.current.formData.prenom).toBe('');
  });

  it('handles API errors gracefully', async () => {
    const { result } = renderHook(() => useContactForm());
    
    // Fill form with valid data
    act(() => {
      result.current.handleInputChange({
        target: { name: 'nom', value: 'Doe' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'prenom', value: 'John' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'email', value: 'john@example.com' }
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleInputChange({
        target: { name: 'message', value: 'Test message with enough characters' }
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    // Mock API error
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const form = new Event('submit', { cancelable: true });
    
    await act(async () => {
      await result.current.handleSubmit(form);
    });
    
    expect(result.current.isLoading).toBe(false);
    // Form data should remain after error
    expect(result.current.formData.nom).toBe('Doe');
  });
});
