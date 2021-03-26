/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as minimatch from 'minimatch';

interface BundleConfig {
    exclude?: string[];
    out?: string;
    id?: string;
    root?: string;
}

const yargs = require('yargs');
const argv = yargs
    .command('bundle', 'bundles files matching glob path pattern', {
        config: {
            description: 'json config file containing settings',
            alias: 'c',
            type: 'string'
        },
        path: {
            description: 'root path of asset bundle files',
            alias: 'p',
            type: 'string'
        },
        out: {
            description: 'output path',
            alias: 'o',
            type: 'string'
        },
        id: {
            description: 'id of the asset bundle',
            alias: 'i',
            type: 'string'
        },
        root: {
            description: 'rootPath',
            alias: 'r',
            type: 'string'
        }
    }).argv;
if (argv._.includes('bundle')) {
    let config = loadConfig(argv);
    console.log('Bundling files in path', config.root);
    let manifestFilename = path.join(config.out, `${config.id}.json`);
    let dataFilename = path.join(config.out, `${config.id}-data.json`);
    let manifest = loadManifest(config.id, manifestFilename);
    let fileData = {};

    let rootGlob = path.join(config.root, '**/*.*');
    let r = path.join(config.root, '');
    let rootLen = r ? r.length + 1 : 0;
    glob(rootGlob, (er, files) => {
        for (let f of files) {
            if (shouldIncludeFile(f, config.exclude)) {
                let stats = fsExtra.statSync(f);
                let key = f.replace((/\//gim), '_').substring(rootLen);
                // console.log(f, ' > ', key);
                manifest.files[key] = Math.round(stats.mtime.getTime() / 1000);

                let data = fsExtra.readFileSync(f, { encoding: 'base64' });
                fileData[key] = data;
            } else {
                // console.log('skipping file:', f);
            }

        }
        console.log('writing manifest to file', manifestFilename);
        fsExtra.writeFileSync(manifestFilename, JSON.stringify(manifest), 'utf8');
        console.log('writing data to file', dataFilename);
        fsExtra.writeFileSync(dataFilename, JSON.stringify(fileData), 'utf8');
    });
}

function loadManifest(id, filename) {
    let manifest = {
        id: id,
        version: 0,
        files: {}
    };
    try {
        let fileDataText = fsExtra.readFileSync(filename, { encoding: 'utf8' });
        manifest = JSON.parse(fileDataText);
        manifest.version++;
        manifest.files = {};

    } catch (error) {

    }
    return manifest;
}

function loadConfig(argv): BundleConfig {
    let config = {} as BundleConfig;
    if (argv.config) {
        try {
            let configText = fsExtra.readFileSync(argv.config, { encoding: 'utf8' });
            config = JSON.parse(configText);
            config.exclude = config.exclude || [
                '**/.git', '**/*:Zone.identifier'
            ];
            config.out = config.out || './';
            config.id = config.id || 'bundle';
            config.root = config.root || '';

        } catch (error) {
            console.error('could not load specified config file', argv.config);
        }
    } else {
        config.exclude = argv.exclude || [
            '**/.git', '**/*:Zone.identifier'
        ];
        config.out = argv.out || './';
        config.id = argv.id || 'bundle';
        config.root = argv.root || '';
    }

    return config;
}

function shouldIncludeFile(filename, patterns) {
    for (let filter of patterns) {
        if (minimatch(filename, filter)) {
            return false;
        }
    }
    return true;
}
