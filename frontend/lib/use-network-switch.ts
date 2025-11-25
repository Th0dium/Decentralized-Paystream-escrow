import { useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";

/**
 * Hook to automatically switch to Sepolia network when wallet is connected
 */
export const useNetworkSwitch = () => {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    // Only switch if connected and not on correct network
    if (isConnected && chainId && chainId !== sepolia.id) {
      console.log("🔄 Switching to Sepolia network...");
      switchChain({ chainId: sepolia.id });
    }
  }, [isConnected, chainId, switchChain]);

  return {
    isOnCorrectNetwork: chainId === sepolia.id,
    currentChainId: chainId,
  };
};
