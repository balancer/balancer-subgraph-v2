# Balancer Subgraph

**Note:** This is an exploratory project and does not necessarily mean Balancer plans to use Graph Protocol as a data layer.

The graphql schema is a first draft and will likely have major breaking changes.

Only the factory address is needed in subgraph.yaml, new pool addresses are automatically picked up using Graph Protocol's data source templates.


## Setup

### Prerequisites

- Global Yarn Packages
    - ganache-cli
    - truffle
    - graph-cli
- Docker

### Services

Start a ganache chain using 0.0.0.0 as a host so docker can connect

```
ganache-cli -h 0.0.0.0 -d -l 4294967295 --allowUnlimitedContractSize
```

Run a local graph node

```
git clone https://github.com/graphprotocol/graph-node/
```

Update ethereum value in docker-compose.yml to `ganache:http://host.docker.internal:8545`

```
cd graph-node/docker
```

```
docker-compose up
```

To blow away graph-node settings

```
docker-compose kill && docker-compose rm -f && rm -rf data
```

### Contracts

Deploy balancer contracts using truffle. Using the `yarn deploy` script in balancer-dapp also makes this easy to test out the subgraph using the frontend.

### Subgraph

Clone the balancer subgraph

```
git clone git@github.com:balancer-labs/balancer-subgraph.git
```

Update factory address in subgraph.yaml to the one listed as part of the deploy

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
yarn create-local
```

Deploy locally

```
yarn deploy-local
```

Any updates can be made to this repo and re-running `yarn deploy-local` without needing to re-initialize the environment.


