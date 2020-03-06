import fs from 'fs';
import path from 'path';
import serialize from 'serialize-javascript';
import runStep from '../runStep';
import { runPrettier } from '../../helper';
import { info } from '../../color';
import { print } from '../../util';

export default async ({
  isScoped,
  isPublic,
  baseBranch,
  releaseBranch,
  useMonorepo,
  mainVersionFile,
  packagesToBump,
  packagesToPublish,
  dir,
  dryRun,
}) =>
  await runStep({ title: 'Creating ship.config.js' }, async () => {
    const { buildExists } = checkIfScriptsExist({ dir });
    const config = {
      ...(isScoped &&
        isPublic && {
          publishCommand: ({ defaultCommand }) =>
            `${defaultCommand} --access public`,
        }),
      mergeStrategy:
        baseBranch === releaseBranch
          ? {
              toSameBranch: [baseBranch],
            }
          : {
              toReleaseBranch: {
                [baseBranch]: releaseBranch,
              },
            },
      ...(useMonorepo && {
        monorepo: {
          mainVersionFile,
          packagesToBump,
          packagesToPublish,
        },
      }),
      ...(!buildExists && { buildCommand: () => null }),
    };
    if (dryRun) {
      print(`ship.config.js`);
      print(serialize(config));
    } else {
      const filePath = path.resolve(dir, 'ship.config.js');
      fs.writeFileSync(
        filePath,
        `module.exports = ${serialize(config, { unsafe: true })};`
      );
      await runPrettier({ filePath, dir });
    }

    return () => {
      print(`${info('✔')} Created \`ship.config.js\`.`);
      print('  You can learn more about the configuration.');
      print(
        '  > https://community.algolia.com/shipjs/guide/useful-config.html'
      );
    };
  });

function checkIfScriptsExist({ dir }) {
  const filePath = path.resolve(dir, 'package.json');
  const json = JSON.parse(fs.readFileSync(filePath).toString());
  const { build } = json.scripts || {};
  return {
    buildExists: Boolean(build),
  };
}
