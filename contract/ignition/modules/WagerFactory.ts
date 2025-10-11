import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WagerFactoryModule = buildModule("WagerFactoryModule", (m) => {
  // Get deployer address as treasury
  const treasury = m.getAccount(0);
  
  // Token addresses based on network
  // Base Sepolia USDC
  const baseUsdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Arbitrum Sepolia tokens
  const arbitrumUsdc = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  const arbitrumPyusd = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1";
  
  // Get supported tokens - will be set via parameters when deploying
  const supportedTokens = m.getParameter("supportedTokens", [baseUsdc]);
  
  // Deploy ReclaimVerifier first
  const reclaimVerifier = m.contract("ReclaimVerifier");
  
  // Deploy WagerFactory with ReclaimVerifier address
  const wagerFactory = m.contract("WagerFactory", [treasury, supportedTokens, reclaimVerifier]);
  
  return { wagerFactory, reclaimVerifier };
});

export default WagerFactoryModule;
