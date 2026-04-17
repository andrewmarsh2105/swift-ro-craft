import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Support from '@/pages/Support';

const getUserMock = vi.fn();
const insertMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
    from: () => ({
      insert: (...args: unknown[]) => insertMock(...args),
    }),
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe('Support page', () => {
  it('prevents duplicate support submissions while the first request is still in flight', async () => {
    let resolveInsert: ((value: { error: null }) => void) | undefined;
    insertMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInsert = resolve;
        }),
    );
    getUserMock.mockResolvedValue({ data: { user: null } });
    invokeMock.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tech User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'tech@example.com' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Need help with import.' } });

    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });

    resolveInsert?.({ error: null });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Message Sent' })).toBeInTheDocument();
    });
  });
});
