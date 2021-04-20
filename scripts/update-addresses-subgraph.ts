import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const network = process.argv[2] || 'mainnet';

function contractAddress(contractName) {
  const file = fs.readFileSync(
    path.resolve(__dirname, '../../core/deployments/artifacts/' + network + '/' + contractName + '.json'),
    'utf8'
  );
  const json = JSON.parse(file);
  return json.address;
}

const suffix: string = network == 'mainnet' ? '' : '.' + network;

const subgraphFilePath = path.resolve(__dirname, '../subgraph' + suffix + '.yaml');
console.log(subgraphFilePath);
let doc = yaml.load(fs.readFileSync(subgraphFilePath, 'utf8'));

doc.dataSources.forEach((ds) => {
  try {
    let address = contractAddress(ds.name);
    ds.source.address = address;
  } catch (err) {
    const msg = 'Cannot find ' + network + ' contract artifacts for ' + ds.name + ' - missing deployment artifacts?';
    console.log(msg);
  }
});

fs.writeFile(subgraphFilePath, yaml.dump(doc, { lineWidth: 150 }), (err) => {
  if (err) {
    console.log(err);
  }
});
