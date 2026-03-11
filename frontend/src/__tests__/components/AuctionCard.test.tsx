import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuctionCard } from '@/components/auctions/AuctionCard';

const mockAuction = {
  id: 'auc-1',
  title: 'Test Dutch Auction',
  description: 'A test auction',
  imageUrl: null,
  type: 'DUTCH',
  status: 'ACTIVE',
  currentPrice: '1000000000000000000',
  highestBid: null,
  totalBids: 3,
  creator: {
    address: '0x1234567890123456789012345678901234567890',
    username: null,
  },
  startTime: null,
  endTime: new Date(Date.now() + 3600000).toISOString(),
};

describe('AuctionCard', () => {
  it('renders auction title and description', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('Test Dutch Auction')).toBeInTheDocument();
    expect(screen.getByText('A test auction')).toBeInTheDocument();
  });

  it('renders auction type and status badges', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('Dutch Auction')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders creator address when no username', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument();
  });

  it('renders bid count', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('3 bids')).toBeInTheDocument();
  });

  it('renders current price in ETH', () => {
    render(<AuctionCard auction={mockAuction} />);
    expect(screen.getByText('1.0000 ETH')).toBeInTheDocument();
  });

  it('links to auction detail page', () => {
    render(<AuctionCard auction={mockAuction} />);
    const link = screen.getByRole('link', { name: /view auction/i });
    expect(link).toHaveAttribute('href', '/auctions/auc-1');
  });
});
