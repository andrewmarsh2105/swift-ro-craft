import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('shows "CP" for customer-pay', () => {
    render(<StatusPill type="customer-pay" />);
    expect(screen.getByText('CP')).toBeInTheDocument();
  });

  it('shows "W" for warranty', () => {
    render(<StatusPill type="warranty" />);
    expect(screen.getByText('W')).toBeInTheDocument();
  });

  it('shows "I" for internal', () => {
    render(<StatusPill type="internal" />);
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('toggles CP -> W -> CP and updates badge live', () => {
    const { rerender } = render(<StatusPill type="customer-pay" />);
    expect(screen.getByText('CP')).toBeInTheDocument();

    rerender(<StatusPill type="warranty" />);
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.queryByText('CP')).not.toBeInTheDocument();

    rerender(<StatusPill type="customer-pay" />);
    expect(screen.getByText('CP')).toBeInTheDocument();
    expect(screen.queryByText('W')).not.toBeInTheDocument();
  });

  it('toggles CP -> I -> CP and updates badge live', () => {
    const { rerender } = render(<StatusPill type="customer-pay" />);
    expect(screen.getByText('CP')).toBeInTheDocument();

    rerender(<StatusPill type="internal" />);
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.queryByText('CP')).not.toBeInTheDocument();

    rerender(<StatusPill type="customer-pay" />);
    expect(screen.getByText('CP')).toBeInTheDocument();
    expect(screen.queryByText('I')).not.toBeInTheDocument();
  });
});
