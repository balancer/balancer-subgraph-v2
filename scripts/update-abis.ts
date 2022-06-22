import * as fs from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';

const coreArtifactPath = path.resolve(__dirname, '../../core/pkg/core/artifacts');
const outputPath = path.resolve(__dirname, '../abis');

const abiJSONfilenames = [
  'Vault',
  'WeightedPool',
  'WeightedPool2Tokens',
  'StablePool',
  'WeightedPoolFactory',
  'StablePoolFactory',
  'BalancerPoolToken',
  'BasePoolFactory',
  'ERC20',
  'BalancerHelpers',
].map((a) => a + '.json');

glob(coreArtifactPath + '/**/!(*dbg).json', {}, (err, files) => {
  if (err) {
    console.error(err);
  }
  for (const filename of files) {
    const split = filename.split('/');
    const contractName = split[split.length - 1];
    if (abiJSONfilenames.includes(contractName)) {
      console.log(contractName);

      const abi = JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8')).abi;

      fs.writeFileSync(outputPath + '/' + contractName, JSON.stringify(abi, null, 2));
    }
  }
});
