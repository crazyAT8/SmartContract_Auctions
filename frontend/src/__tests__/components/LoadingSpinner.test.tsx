import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />);
    const wrapper = document.querySelector('.animate-spin');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies size class for sm', () => {
    render(<LoadingSpinner size="sm" />);
    const el = document.querySelector('.h-4.w-4') || document.querySelector('.h-4');
    expect(el).toBeInTheDocument();
  });

  it('applies size class for lg', () => {
    render(<LoadingSpinner size="lg" />);
    const el = document.querySelector('.h-12');
    expect(el).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
