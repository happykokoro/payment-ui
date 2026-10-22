import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { base, baseSepolia } from 'wagmi/chains';
import { Checkout } from './Checkout';
import './style.css';
const config = createConfig({ chains: [baseSepolia, base], multiInjectedProviderDiscovery: true,
  connectors: [injected()], transports: { [base.id]: http(), [baseSepolia.id]: http() } });
const queryClient = new QueryClient();
function CheckoutEntry() {
  const [fragment, setFragment] = useState(location.hash);
  useEffect(() => { const changed = () => setFragment(location.hash); window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  return <Checkout key={fragment}/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><WagmiProvider config={config}><QueryClientProvider client={queryClient}><CheckoutEntry/></QueryClientProvider></WagmiProvider></React.StrictMode>);
