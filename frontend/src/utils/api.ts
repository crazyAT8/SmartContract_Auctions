'use client'

import { ethers } from 'ethers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const AUTH_TOKEN_KEY = 'auth_token'

/**
 * Real wallet auth: nonce → sign message → login.
 * 1. POST /auth/nonce with address → get nonce + message
 * 2. Sign message with wallet (signer.signMessage)
 * 3. POST /auth/login with address, signature, nonce → get JWT
 */
export async function getAuthToken(signer: ethers.JsonRpcSigner, address: string): Promise<string | null> {
  try {
    const nonceResponse = await fetch(`${API_BASE_URL}/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })

    if (!nonceResponse.ok) {
      const err = await nonceResponse.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to get nonce')
    }

    const { nonce, message } = await nonceResponse.json()
    if (!nonce || !message) throw new Error('Invalid nonce response')

    const signature = await signer.signMessage(message)

    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, nonce }),
    })

    if (!loginResponse.ok) {
      const err = await loginResponse.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to authenticate')
    }

    const data = await loginResponse.json()
    const token = data.token
    if (!token) throw new Error('No token in login response')

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    }
    return token
  } catch (error) {
    console.error('Auth (nonce → sign → login) failed:', error)
    return null
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

/**
 * Authenticated request. Uses stored JWT; if none and signer+address provided,
 * runs nonce → sign → login first, then sends request with Bearer token.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  signer?: ethers.JsonRpcSigner,
  address?: string
): Promise<Response> {
  let token = getStoredAuthToken()
  if (!token && signer && address) {
    token = await getAuthToken(signer, address)
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(url, { ...options, headers })
}

/**
 * API request with real auth: uses nonce → sign → login when signer/address
 * are provided and no token is stored. For protected routes, auth failures
 * are thrown instead of falling back to unauthenticated requests.
 */
export async function apiRequest(
  url: string,
  options: RequestInit = {},
  signer?: ethers.JsonRpcSigner,
  address?: string
): Promise<Response> {
  const res = await authenticatedFetch(url, options, signer, address)
  if (res.status === 401 && signer && address) {
    clearAuthToken()
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Authentication required')
  }
  return res
}

