'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '@/contexts/Web3Context'
import { getAuctionABI } from '@/contracts/contracts'
import { formatEther } from '@/utils/formatting'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { EyeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const SEALED_BID_STORAGE_KEY = 'sealedBidReveal'

export interface SealedBidPhase {
  phase: 'bidding' | 'reveal' | 'ended'
  biddingEnd: string
  revealEnd: string
  now: number
}

export interface StoredSealedBid {
  valueWei: string
  secret: string
}

function getStoredSealedBid(auctionId: string, account: string): StoredSealedBid | null {
  try {
    const key = `${SEALED_BID_STORAGE_KEY}_${auctionId}_${account}`
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredSealedBid
    if (data.valueWei && data.secret) return data
    return null
  } catch {
    return null
  }
}

function clearStoredSealedBid(auctionId: string, account: string) {
  try {
    const key = `${SEALED_BID_STORAGE_KEY}_${auctionId}_${account}`
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

interface SealedBidRevealProps {
  auctionId: string
  contractAddress: string
  onRevealed?: () => void
}

export function SealedBidReveal({ auctionId, contractAddress, onRevealed }: SealedBidRevealProps) {
  const { isConnected, account, signer } = useWeb3()
  const [phaseState, setPhaseState] = useState<SealedBidPhase | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState(false)
  const [stored, setStored] = useState<StoredSealedBid | null>(null)
  const [manualValue, setManualValue] = useState('')
  const [manualSecret, setManualSecret] = useState('')

  const fetchState = useCallback(async () => {
    if (!contractAddress) return
    try {
      const res = await fetch(
        `${API_BASE_URL}/web3/auction/${encodeURIComponent(contractAddress)}/state?type=SEALED_BID`
      )
      if (!res.ok) return
      const data = await res.json()
      const now = Math.floor(Date.now() / 1000)
      const biddingEnd = Number(data.biddingEnd ?? 0)
      const revealEnd = Number(data.revealEnd ?? 0)
      let phase: SealedBidPhase['phase'] = 'bidding'
      if (now >= revealEnd) phase = 'ended'
      else if (now >= biddingEnd) phase = 'reveal'
      setPhaseState({
        phase,
        biddingEnd: data.biddingEnd,
        revealEnd: data.revealEnd,
        now,
      })
    } catch {
      setPhaseState(null)
    } finally {
      setLoading(false)
    }
  }, [contractAddress])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 10000)
    return () => clearInterval(interval)
  }, [fetchState])

  useEffect(() => {
    if (account && auctionId) {
      setStored(getStoredSealedBid(auctionId, account))
    } else {
      setStored(null)
    }
  }, [auctionId, account])

  const handleReveal = async () => {
    if (!contractAddress || !signer || !account) {
      toast.error('Connect your wallet to reveal')
      return
    }
    const abi = getAuctionABI('SEALED_BID')
    if (!abi) {
      toast.error('Contract ABI not available')
      return
    }

    let valueWei: bigint
    let secretHex: string

    if (stored) {
      valueWei = BigInt(stored.valueWei)
      secretHex = stored.secret.startsWith('0x') ? stored.secret : `0x${stored.secret}`
    } else {
      if (!manualValue || parseFloat(manualValue) <= 0) {
        toast.error('Enter a valid bid value (ETH)')
        return
      }
      valueWei = ethers.parseEther(manualValue)
      const s = manualSecret.trim()
      if (!s) {
        toast.error('Enter your reveal secret (32-byte hex)')
        return
      }
      secretHex = s.startsWith('0x') ? s : `0x${s}`
      if (secretHex.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(secretHex)) {
        toast.error('Secret must be 32 bytes (64 hex characters)')
        return
      }
    }

    setRevealing(true)
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer)
      toast.loading('Confirm reveal in your wallet...', { id: 'reveal-pending' })
      const tx = await contract.reveal(valueWei, secretHex)
      toast.loading('Waiting for confirmation...', { id: 'reveal-pending' })
      await tx.wait()
      toast.success('Bid revealed successfully!', { id: 'reveal-pending' })
      clearStoredSealedBid(auctionId, account)
      setStored(null)
      setManualValue('')
      setManualSecret('')
      fetchState()
      onRevealed?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reveal failed'
      toast.error(msg, { id: 'reveal-pending' })
      console.error('Reveal error:', err)
    } finally {
      setRevealing(false)
    }
  }

  if (loading || !phaseState) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500">Loading sealed bid phase...</p>
      </div>
    )
  }

  if (phaseState.phase !== 'reveal') {
    return null
  }

  const canReveal = stored || (manualValue && manualSecret)
  const revealEndDate = new Date(Number(phaseState.revealEnd) * 1000)

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-amber-800">
        <EyeIcon className="h-5 w-5 shrink-0" />
        <h3 className="font-semibold">Reveal phase</h3>
      </div>
      <p className="text-sm text-amber-700">
        Bidding has ended. Reveal your bid before {revealEndDate.toLocaleString()}. If you don&apos;t reveal, your deposit may not count toward winning.
      </p>

      {!isConnected ? (
        <div className="flex items-center gap-2 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-700 shrink-0" />
          <p className="text-sm text-yellow-800">Connect your wallet to reveal your bid.</p>
        </div>
      ) : (
        <>
          {stored ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Stored bid from this browser: <strong>{formatEther(stored.valueWei)} ETH</strong>
              </p>
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing}
                className="w-full btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revealing ? 'Revealing...' : 'Reveal your bid'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Enter the bid value and secret you used when placing your sealed bid (e.g. from another device or backup).
              </p>
              <div>
                <label htmlFor="reveal-value" className="block text-sm font-medium text-gray-700 mb-1">
                  Bid value (ETH)
                </label>
                <input
                  id="reveal-value"
                  type="text"
                  inputMode="decimal"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="reveal-secret" className="block text-sm font-medium text-gray-700 mb-1">
                  Secret (32-byte hex, 0x + 64 chars)
                </label>
                <input
                  id="reveal-secret"
                  type="text"
                  value={manualSecret}
                  onChange={(e) => setManualSecret(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing || !canReveal}
                className="w-full btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revealing ? 'Revealing...' : 'Reveal bid'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
