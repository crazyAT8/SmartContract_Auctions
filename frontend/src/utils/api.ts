'use client'

import { ethers } from 'ethers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Get JWT token by signing a message with wallet
export async function getAuthToken(signer: ethers.JsonRpcSigner, address: string): Promise<string | null> {
  try {
    // For now, we'll use a simple approach - in production, you'd want to:
    // 1. Request a nonce from the backend
    // 2. Sign a message containing the nonce
    // 3. Send the signature to the backend to get a JWT token
    
    // Placeholder: In a real implementation, you'd call an auth endpoint
    // For now, we'll return null and let the backend handle it differently
    // or implement a proper auth flow
    
    const message = `Sign in to Auction dApp\n\nAddress: ${address}\nTimestamp: ${Date.now()}`
    const signature = await signer.signMessage(message)
    
    // In production, send signature to backend /api/auth/login endpoint
    // For now, we'll store it in localStorage as a temporary solution
    const token = btoa(JSON.stringify({ address, signature, timestamp: Date.now() }))
    localStorage.setItem('auth_token', token)
    
    return token
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// Get stored auth token
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// Make authenticated API request
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  signer?: ethers.JsonRpcSigner,
  address?: string
): Promise<Response> {
  let token = getStoredAuthToken()
  
  // If no token and we have signer/address, try to get one
  if (!token && signer && address) {
    token = await getAuthToken(signer, address)
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

// For now, we'll use a simpler approach - the backend might need to be updated
// to handle wallet-based auth differently. This is a placeholder implementation.
export async function apiRequest(
  url: string,
  options: RequestInit = {},
  signer?: ethers.JsonRpcSigner,
  address?: string
): Promise<Response> {
  // Try authenticated first, fallback to regular fetch
  try {
    return await authenticatedFetch(url, options, signer, address)
  } catch (error) {
    // Fallback to regular fetch if auth fails
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }
}

