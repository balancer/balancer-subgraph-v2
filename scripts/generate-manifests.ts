import Handlebars = require('handlebars');
import fs = require('fs');
import path = require('path');

const generateManifests = async (): Promise<void> => {
  const networksFilePath = path.resolve(__dirname, '../networks.json');
  const networks: Record<string, Record<string, unknown>> = JSON.parse(
    fs.readFileSync(networksFilePath, { encoding: 'utf-8' })
  );

  const template = fs.readFileSync('manifest.template.yaml').toString();
  Object.entries(networks).forEach(([network, config]) => {
    // if both config.graft and config.graft_pruned are defined, generate two manifests
    fs.writeFileSync(`subgraph.${network}.yaml`, Handlebars.compile(template)(config));
  });

  // eslint-disable-next-line no-console
  console.log('🎉 subgraph successfully generated\n');
};

generateManifests();
