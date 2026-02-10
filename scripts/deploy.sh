#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GRAPH_NODE="https://api.subgraph.ormilabs.com/deploy"
IPFS_NODE="https://api.subgraph.ormilabs.com/ipfs"
DEPLOY_KEY="${ORMI_DEPLOY_KEY}"

# Check if deploy key is set
if [ -z "$DEPLOY_KEY" ]; then
  echo "${RED}Error: ORMI_DEPLOY_KEY environment variable is not set${NC}"
  exit 1
fi

# Get the latest git commit hash
VERSION=$(git rev-parse --short HEAD)

if [ -z "$VERSION" ]; then
  echo "${RED}Error: Failed to get git commit hash${NC}"
  exit 1
fi

echo "${GREEN}Using git commit hash as version: ${VERSION}${NC}"
echo ""

# List of networks to deploy (excluding test networks)
# List of networks to deploy (excluding test networks)
if [ -n "$1" ]; then
  # Use the network provided as first argument
  NETWORKS=("$1")
  echo "${GREEN}Deploying to specific network: ${1}${NC}"
else
  # Deploy to all networks
  NETWORKS=(
    "mainnet"
    "polygon"
    "arbitrum"
    "gnosis"
    "optimism"
    "avalanche"
    "polygon-zkevm"
    "base"
    "sonic"
    "frax"
    "mode"
  )
fi

echo "${GREEN}Deploying subgraphs to networks with version ${VERSION}...${NC}"
echo ""

# Deploy each network
for network in "${NETWORKS[@]}"; do
  SUBGRAPH_NAME="v2-${network}-smol"
  SUBGRAPH_FILE="subgraph.${network}.yaml"

  # Check if subgraph file exists
  if [ ! -f "$SUBGRAPH_FILE" ]; then
    echo "${YELLOW}Warning: ${SUBGRAPH_FILE} not found, skipping...${NC}"
    continue
  fi

  echo "${GREEN}Deploying ${SUBGRAPH_NAME}...${NC}"
  echo "  Version: ${VERSION}"

  # Deploy the subgraph
  echo "  Deploying..."
  if npx graph deploy "$SUBGRAPH_NAME" "$SUBGRAPH_FILE" \
    --node "$GRAPH_NODE" \
    --ipfs "$IPFS_NODE" \
    --deploy-key "$DEPLOY_KEY" \
    --version-label "${VERSION}"; then
    echo "  ${GREEN}✓ Successfully deployed ${SUBGRAPH_NAME} ${VERSION}${NC}"
  else
    echo "  ${RED}✗ Failed to deploy ${SUBGRAPH_NAME}${NC}"
  fi

  echo ""
done

echo "${GREEN}Deployment complete!${NC}"
