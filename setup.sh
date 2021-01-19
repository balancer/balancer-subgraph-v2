git submodule add git@github.com:balancer-labs/balancer-core-v2.git core
cd core && yarn && popd
git submodule add git@github.com:balancer-labs/balancer.eth.git balancer.eth
cd balancer.eth && npm install && popd
