# Balancer Subgraph

The graphql schema is still under heavy development and will likely have major breaking changes.

This repo tracks both the subgraph and a docker configuration that allows you to run the subgraph and frontend against the core v2 contracts.

## Setup

### Prerequisites

- Global Yarn Packages
    - truffle
    - graph-cli
- Docker

Clone the `pool-management-v2` repo and `core` repo submodules

### Recommended setup: Running V2 contracts, frontend and subgraph against development parity chain

Docker compose can be started in various configurations to start a local etherem chain, a graph-node, and it's requisite services.

Start a parity chain and a graph node by running
```
yarn restart:parity
```

Then deploy V2 contracts, seed data and deploy subgraph

```
cd core && yarn redeploy:docker && popd
yarn codegen && yarn create:local && yarn deploy:local
```
now you should be able to interact with the graphql server at
http://localhost:8000/subgraphs/name/balancer-labs/balancer-v2

Start the pool management frontend:
```
cd pool-management-v2 && yarn serve
```

Once setup, you can access the services at the addresses below

### Services

| Service                          | address               |
|----------------------------------|-----------------------|
| JSON-RPC Server                  | http://localhost:8545 |
| GraphQL HTTP server              | http://localhost:8000 |
| Graph Node JSON-RPC admin server | http://localhost:8020 |
| Graph Node IndexNode server      | http://localhost:8030 |
| Graph Node Metrics server        | http://localhost:8040 |
| Graph Node WebSocket server      |   ws://localhost:8001 |


## Alternative Docker Compose Settings

### Running services against a hardhat chain

The docker-compose can be overridden to test contracts, subgraph, frontend against other networks.  This is not generally recommended because the hardhat VM doesn't support call tracing which the subgraph uses to track contract calls. YMMV


Start a hardhat chain and a graph node by running
```
docker-compose -f docker-compose.yml -f docker-compose.hardhat.yml up
```

Start a ganache chain and a graph node by running
```
docker-compose -f docker-compose.yml -f docker-compose.ganache.yml up
```

To blow away graph-node settings

```
docker-compose kill && docker-compose rm -f && rm -rf data
```

## Components
### Contracts

Deploy balancer contracts using truffle. Using the `yarn deploy` script in balancer-v2 also makes this easy to test out the subgraph using the frontend.

### Subgraph

Clone the balancer subgraph

```
git clone git@github.com:balancer-labs/balancer-subgraph-v2.git
```

Update deployed contract address in subgraph.yaml to the ones listed as part of the deploy

Install dependencies

```
yarn
```

Generate the graph code

```
yarn codegen
```

Create local node

```
yarn create:local
```

Deploy locally

```
yarn deploy:local
```

Any updates can be made to this repo and re-running `yarn deploy:local` without needing to re-initialize the environment.

## Running Locally With Parity Kovan Node

Start Parity:

```
parity --chain=kovan --jsonrpc-interface=0.0.0.0
```

Update ethereum value in docker-compose.yml to `kovan:http://host.docker.internal:8545`

Comment out try_ functions in pool.ts LN52-64

```
docker-compose up
```

Create local node

```
yarn create:local
```

Deploy locally

```
yarn deploy:local
```
