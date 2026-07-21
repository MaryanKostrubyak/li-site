import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('uses plain English labels in the interface', () => {
    render(<StatusBadge status='no_show' />);
    expect(screen.getByText('No-show')).toBeInTheDocument();
  });
});
