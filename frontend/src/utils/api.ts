'use client'

import { ethers } from 'ethers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Get JWT token by signing a message with wallet
export async function getAuthToken(signer: ethers.JsonRpcSigner, address: string): Promise<string | null> {
  try {
    // Step 1: Request a nonce from the backend
    const nonceResponse = await fetch(`${API_BASE_URL}/auth/nonce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    })

    if (!nonceResponse.ok) {
      const error = await nonceResponse.json()
      throw new Error(error.error || 'Failed to get nonce')
    }

    const { nonce, message } = await nonceResponse.json()

    // Step 2: Sign the message containing the nonce
    const signature = await signer.signMessage(message)

    // Step 3: Send the signature to the backend to get a JWT token
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, signature, nonce }),
    })

    if (!loginResponse.ok) {
      const error = await loginResponse.json()
      throw new Error(error.error || 'Failed to authenticate')
    }

    const { token } = await loginResponse.json()

    // Store token in localStorage
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

