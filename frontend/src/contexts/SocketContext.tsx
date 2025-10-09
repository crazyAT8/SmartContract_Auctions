'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinAuction: (auctionId: string) => void
  leaveAuction: (auctionId: string) => void
  joinUser: (userId: string) => void
  leaveUser: (userId: string) => void
  placeBid: (data: { auctionId: string; amount: string; bidderId: string }) => void
  updateAuctionState: (auctionId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    const newSocket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Failed to connect to server')
    })

    newSocket.on('auction_state', (data) => {
      console.log('Auction state update:', data)
    })

    newSocket.on('new_bid', (data) => {
      console.log('New bid received:', data)
      toast.success(`New bid: ${data.amount} ETH`)
    })

    newSocket.on('auction_event', (data) => {
      console.log('Auction event:', data)
      toast.success(data.data.message || 'Auction event occurred')
    })

    newSocket.on('notification', (data) => {
      console.log('Notification received:', data)
      toast.success(data.message)
    })

    newSocket.on('bid_error', (data) => {
      console.error('Bid error:', data)
      toast.error(data.message || 'Failed to place bid')
    })

    newSocket.on('error', (data) => {
      console.error('Socket error:', data)
      toast.error(data.message || 'An error occurred')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const joinAuction = (auctionId: string) => {
    if (socket) {
      socket.emit('join_auction', auctionId)
    }
  }

  const leaveAuction = (auctionId: string) => {
    if (socket) {
      socket.emit('leave_auction', auctionId)
    }
  }

  const joinUser = (userId: string) => {
    if (socket) {
      socket.emit('join_user', userId)
    }
  }

  const leaveUser = (userId: string) => {
    if (socket) {
      socket.emit('leave_user', userId)
    }
  }

  const placeBid = (data: { auctionId: string; amount: string; bidderId: string }) => {
    if (socket) {
      socket.emit('place_bid', data)
    }
  }

  const updateAuctionState = (auctionId: string) => {
    if (socket) {
      socket.emit('update_auction_state', auctionId)
    }
  }

  const value: SocketContextType = {
    socket,
    isConnected,
    joinAuction,
    leaveAuction,
    joinUser,
    leaveUser,
    placeBid,
    updateAuctionState
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
