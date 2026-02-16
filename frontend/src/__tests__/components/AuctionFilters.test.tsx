import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuctionFilters } from '@/components/auctions/AuctionFilters';

const defaultFilters = {
  search: '',
  type: '',
  status: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

describe('AuctionFilters', () => {
  it('renders search input', () => {
    const onFiltersChange = jest.fn();
    render(<AuctionFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);
    expect(screen.getByPlaceholderText('Search auctions...')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search input changes', () => {
    const onFiltersChange = jest.fn();
    render(<AuctionFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search auctions...'), {
      target: { value: 'test' },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: 'test',
    });
  });

  it('clears filters when clear button is clicked', () => {
    const onFiltersChange = jest.fn();
    render(
      <AuctionFilters
        filters={{ ...defaultFilters, search: 'x', type: 'DUTCH' }}
        onFiltersChange={onFiltersChange}
      />
    );
    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearButton);
    expect(onFiltersChange).toHaveBeenCalledWith({
      search: '',
      type: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
});
