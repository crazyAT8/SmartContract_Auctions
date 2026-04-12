import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { mainnet, polygon, arbitrum, optimism, localhost } from 'viem/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

const { chains, publicClient } = configureChains(
  [mainnet, polygon, arbitrum, optimism, localhost],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID || '' }),
    publicProvider()
  ]
)

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID

const connectors = projectId
  ? getDefaultWallets({
      appName: 'Auction DApp',
      projectId,
      chains,
    }).connectors
  : [
      new InjectedConnector({
        chains,
        options: { shimDisconnect: true },
      }),
    ]

export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

export { chains }
