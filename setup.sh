git submodule add git@github.com:balancer-labs/balancer-core-v2.git core
cd core && yarn && popd

git submodule add git@github.com:balancer-labs/pool-management-v2.git pool-management-v2
cd pool-management-v2 && npm install && popd
