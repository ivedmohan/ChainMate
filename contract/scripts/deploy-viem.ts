import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, arbitrumSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { join } from 'path';
import hre from 'hardhat';

// Load contract ABI and bytecode
const artifactPath = join(process.cwd(), 'artifacts/contracts/WagerFactory.sol/WagerFactory.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

async function main() {
    console.log("🚀 Deploying ChainMate WagerFactory...\n");

    // Get private key from environment
    const privateKeyRaw = process.env.PRIVATE_KEY;
    if (!privateKeyRaw) {
        throw new Error("PRIVATE_KEY not found in environment");
    }

    // Ensure private key has 0x prefix
    const privateKey = (privateKeyRaw.startsWith('0x') ? privateKeyRaw : `0x${privateKeyRaw}`) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    console.log("Deploying with account:", account.address);

    // Determine which network based on Hardhat's network
    // In Hardhat 3.0, we need to get the network from config
    const networkName = hre.config.defaultNetwork || 'baseSepolia';

    // Check if a specific network was passed via CLI
    const cliNetwork = process.argv.find(arg => arg.startsWith('--network'))?.split('=')[1] ||
        process.argv[process.argv.indexOf('--network') + 1];

    const actualNetwork = cliNetwork || networkName;
    console.log("Deploying to network:", actualNetwork);

    let chain, rpcUrl;
    let supportedTokens: `0x${string}`[];

    if (actualNetwork === 'baseSepolia') {
        chain = baseSepolia;
        rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
        supportedTokens = ['0x036CbD53842c5426634e7929541eC2318f3dCF7e']; // Base USDC
        console.log("\nDeploying to: Base Sepolia");
    } else if (actualNetwork === 'arbitrumSepolia') {
        chain = arbitrumSepolia;
        rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
        supportedTokens = [
            '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum USDC
            '0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1'  // Arbitrum PYUSD
        ];
        console.log("\nDeploying to: Arbitrum Sepolia");
    } else {
        throw new Error(`Unsupported network: ${actualNetwork}`);
    }

    console.log("Chain ID:", chain.id);
    console.log("Supported tokens:", supportedTokens);
    console.log("Treasury address:", account.address);

    // Create clients
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
    });

    // Deploy ReclaimVerifier first
    console.log("\n📝 Deploying ReclaimVerifier...");
    
    const verifierArtifactPath = join(process.cwd(), 'artifacts/contracts/ReclaimVerifier.sol/ReclaimVerifier.json');
    const verifierArtifact = JSON.parse(readFileSync(verifierArtifactPath, 'utf8'));
    
    const verifierHash = await walletClient.deployContract({
        abi: verifierArtifact.abi,
        bytecode: verifierArtifact.bytecode as `0x${string}`,
        args: [],
    });
    
    console.log("ReclaimVerifier transaction hash:", verifierHash);
    console.log("Waiting for confirmation...");
    
    const verifierReceipt = await publicClient.waitForTransactionReceipt({ hash: verifierHash });
    const verifierAddress = verifierReceipt.contractAddress;
    
    if (!verifierAddress) {
        throw new Error("ReclaimVerifier deployment failed - no address returned");
    }
    
    console.log("✅ ReclaimVerifier deployed at:", verifierAddress);

    // Deploy WagerFactory with ReclaimVerifier address
    console.log("\n📝 Deploying WagerFactory...");

    const hash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode as `0x${string}`,
        args: [account.address, supportedTokens, verifierAddress],
    });

    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress;

    if (!address) {
        throw new Error("Contract deployment failed - no address returned");
    }

    console.log("\n✅ Deployment successful!");
    console.log("WagerFactory address:", address);

    // Get explorer URL
    let explorerUrl = "";
    if (chain.id === baseSepolia.id) {
        explorerUrl = `https://sepolia.basescan.org/address/${address}`;
    } else if (chain.id === arbitrumSepolia.id) {
        explorerUrl = `https://sepolia.arbiscan.io/address/${address}`;
    }

    if (explorerUrl) {
        console.log("Explorer:", explorerUrl);
    }

    // Save deployment info
    const deployment = {
        network: actualNetwork,
        chainId: chain.id,
        reclaimVerifier: verifierAddress,
        wagerFactory: address,
        treasury: account.address,
        supportedTokens,
        timestamp: new Date().toISOString(),
    };

    console.log("\n📊 Deployment Summary:");
    console.log(JSON.stringify(deployment, null, 2));

    return deployment;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
