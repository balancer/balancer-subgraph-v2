import fs = require('fs');
import path = require('path');

const RPC_URLS: Record<string, string[]> = {
  mainnet: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
  goerli: ['https://rpc.ankr.com/eth_goerli', 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  polygon: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon', 'https://polygon-bor.publicnode.com'],
  arbitrum: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum', 'https://arbitrum-one.publicnode.com'],
  bnb: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc', 'https://bsc-rpc.publicnode.com'],
  gnosis: ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis', 'https://gnosis.publicnode.com'],
  optimism: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism', 'https://optimism.publicnode.com'],
  avalanche: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche-c-chain.publicnode.com',
  ],
  basegoerli: ['https://goerli.base.org'],
  sepolia: ['https://rpc.ankr.com/eth_sepolia', 'https://ethereum-sepolia.publicnode.com'],
  'polygon-zkevm': ['https://zkevm-rpc.com', 'https://rpc.ankr.com/polygon_zkevm'],
  base: ['https://mainnet.base.org', 'https://base.publicnode.com', 'https://rpc.ankr.com/base'],
  sonic: ['https://rpc.soniclabs.com', 'https://sonic.drpc.org', 'https://sonic-json-rpc.stakely.io'],
};

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: { code: number; message: string };
}

async function fetchBlockNumber(rpcUrl: string): Promise<number | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as JsonRpcResponse;
    if (data.error || !data.result) {
      return null;
    }

    return parseInt(data.result, 16);
  } catch {
    return null;
  }
}

async function getLatestBlock(network: string): Promise<number | null> {
  const rpcUrls = RPC_URLS[network];

  if (!rpcUrls) {
    return null;
  }

  for (const rpcUrl of rpcUrls) {
    const blockNumber = await fetchBlockNumber(rpcUrl);
    if (blockNumber !== null) {
      return blockNumber;
    }
  }

  return null;
}

async function updateAllNetworks(): Promise<void> {
  const networksFilePath = path.resolve(__dirname, '../networks.json');
  const fileContent = fs.readFileSync(networksFilePath, 'utf-8');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networks: Record<string, any> = JSON.parse(fileContent) as Record<string, any>;

  for (const network of Object.keys(networks)) {
    if (!networks[network].Vault) {
      console.log(`${network}: Vault not defined, skipping`);
      continue;
    }

    const blockNumber = await getLatestBlock(network);
    if (blockNumber === null) {
      console.log(`${network}: Failed to fetch block number`);
      continue;
    }

    // Update the storeEventsFrom field directly in the networks object
    networks[network].Vault.storeEventsFrom = blockNumber.toString();

    console.log(`${network}: Updated to "${blockNumber}"`);
  }

  // Write the updated networks object back to the JSON file
  fs.writeFileSync(networksFilePath, JSON.stringify(networks, null, 2) + '\n');
}

updateAllNetworks();
