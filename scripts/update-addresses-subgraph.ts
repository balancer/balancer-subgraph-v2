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

doc.dataSources.forEach((ds) => {
  let address = contractAddress(ds.name)
  ds.source.address = address
})

fs.writeFile('./Settings.yml', yaml.dump(doc), (err) => {
    if (err) {
        console.log(err);
    }
});
