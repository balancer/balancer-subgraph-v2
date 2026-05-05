import yaml = require('js-yaml');

import Handlebars = require('handlebars');
import fs = require('fs');
import path = require('path');

const network = process.argv[2] || 'mainnet';

const generateAssets = async (): Promise<void> => {
  const networksFilePath = path.resolve(__dirname, `../assets/${network}.json`);
  const config = yaml.load(fs.readFileSync(networksFilePath, { encoding: 'utf-8' }));
  config['network'] = network;

  const template = fs.readFileSync('assets.handlebars').toString();
  fs.writeFileSync('src/mappings/helpers/assets.ts', Handlebars.compile(template)(config));

  // eslint-disable-next-line no-console
  console.log(`🎉 ${network} assets successfully generated\n`);
};

generateAssets();
