'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { getAuthToken, clearAuthToken } from '@/utils/api'

/** EIP-3085 wallet_addEthereumChain params */
interface AddEthereumChainParameter {
  chainId: string
  chainName: string
  rpcUrls: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrls?: string[]
}

/** MetaMask / EIP-1193 provider with event subscriptions */
type EthereumProvider = ethers.Eip1193Provider & {
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): void
  on(event: 'chainChanged', listener: (chainId: string) => void): void
  on(event: 'disconnect', listener: () => void): void
}

interface Web3ContextType {
  account: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
  getBalance: () => Promise<string>
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function getErrorCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'number') return code
  }
  return undefined
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkConnection()
    setupEventListeners()
  }, [])

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = (await window.ethereum.request({
          method: 'eth_accounts',
        })) as string[]
        if (accounts.length > 0) {
          await connect()
        }
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }

  const setupEventListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('disconnect', handleDisconnect)
    }
  }

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect()
    } else {
      clearAuthToken()
      setAccount(accounts[0])
      if (provider) {
        try {
          const newSigner = await provider.getSigner()
          setSigner(newSigner)
          await getAuthToken(newSigner, accounts[0])
        } catch (error) {
          console.error('Error re-authenticating after account change:', error)
        }
      }
    }
  }

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16))
    window.location.reload()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      setAccount(accounts[0])
      setProvider(provider)
      setSigner(signer)
      setChainId(Number(network.chainId))
      setIsConnected(true)

      await getAuthToken(signer, accounts[0])

      toast.success('Wallet connected successfully')
    } catch (error: unknown) {
      console.error('Error connecting wallet:', error)
      toast.error(getErrorMessage(error, 'Failed to connect wallet'))
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    clearAuthToken()
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setIsConnected(false)
    toast.success('Wallet disconnected')
  }

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed')
      return
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      })
    } catch (error: unknown) {
      if (getErrorCode(error) === 4902) {
        // Chain not added, try to add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [getNetworkConfig(targetChainId)],
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
          toast.error('Failed to add network')
        }
      } else {
        console.error('Error switching network:', error)
        toast.error('Failed to switch network')
      }
    }
  }

  const getBalance = async (): Promise<string> => {
    if (!provider || !account) return '0'
    
    try {
      const balance = await provider.getBalance(account)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Error getting balance:', error)
      return '0'
    }
  }

  const getNetworkConfig = (chainId: number): AddEthereumChainParameter => {
    const networks: Record<number, AddEthereumChainParameter> = {
      1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_KEY'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://etherscan.io'],
      },
      11155111: {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
        nativeCurrency: { name: 'SepoliaETH', symbol: 'SepoliaETH', decimals: 18 },
        blockExplorerUrls: ['https://sepolia.etherscan.io'],
      },
      1337: {
        chainId: '0x539',
        chainName: 'Localhost',
        rpcUrls: ['http://localhost:8545'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: [],
      },
    }

    return networks[chainId] || networks[1]
  }

  const value: Web3ContextType = {
    account,
    provider,
    signer,
    chainId,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    switchNetwork,
    getBalance
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}
