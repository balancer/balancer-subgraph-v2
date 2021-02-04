import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const network = process.argv[2] || 'dockerParity';

function contractAddress(contractName) {
  const file = fs.readFileSync(path.resolve(__dirname,'../core/deployments/artifacts/' + network + '/' + contractName + '.json'), 'utf8');
  const json = JSON.parse(file)
  return json.address
}


const subgraphFilePath = path.resolve(__dirname, '../subgraph.yaml')
let doc = yaml.load(fs.readFileSync(subgraphFilePath, 'utf8'));

try {
  doc.dataSources.forEach((ds) => {
    let address = contractAddress(ds.name)
    ds.source.address = address
  })
  fs.writeFile(subgraphFilePath, yaml.dump(doc, {lineWidth: 150}), (err) => {
    if (err) {
      console.log(err);
    }
  });
} catch (err) {
  const msg = 'Cannot find ' + network + ' contract artifacts - have you deployed core contracts to it?'
  console.log(msg)
}
