import yaml = require('js-yaml');

import Handlebars = require('handlebars');
import fs = require('fs-extra');
import path = require('path');

const generateManifests = async (): Promise<void> => {
  const networksFilePath = path.resolve(__dirname, '../networks.yaml');
  const networks: Record<string, Record<string, unknown>> = yaml.load(
    await fs.readFile(networksFilePath, { encoding: 'utf-8' })
  );

  const template = fs.readFileSync('manifest.template.yaml').toString();
  Object.entries(networks).forEach(([network, config]) => {
    // if both config.graft and config.graft_pruned are defined, generate two manifests
    if (config.graft && config.graft_pruned) {
      const pruned_config = { ...config };
      delete pruned_config.graft;
      fs.writeFileSync(
        `subgraph${network === 'mainnet' ? '' : `.${network}`}.pruned.yaml`,
        Handlebars.compile(template)(pruned_config)
      );

      const unpruned_config = { ...config };
      delete unpruned_config.graft_pruned;
      fs.writeFileSync(
        `subgraph${network === 'mainnet' ? '' : `.${network}`}.yaml`,
        Handlebars.compile(template)(unpruned_config)
      );
    } else {
      fs.writeFileSync(
        `subgraph${network === 'mainnet' ? '' : `.${network}`}.yaml`,
        Handlebars.compile(template)(config)
      );
    }
    // remove the graft info from the config to generate a full sync subgraph
    delete config.graft;
    delete config.graft_pruned;
    fs.writeFileSync(`subgraph.${network}.full.yaml`, Handlebars.compile(template)(config));
  });

  // eslint-disable-next-line no-console
  console.log('🎉 subgraph successfully generated\n');
};

generateManifests();
