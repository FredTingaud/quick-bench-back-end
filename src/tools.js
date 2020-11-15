var fs = require('fs');

function write(fileName, code) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, code, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function read(fileName, acceptMissing) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf8', (err, data) => {
            if (err) {
                if (acceptMissing && err.code === 'ENOENT') {
                    resolve(null);
                } else {
                    reject(err);
                }
            } else {
                resolve(data);
            }
        });
    });
}

function encodeName(id) {
    let short = Buffer.from(id, 'hex').toString('base64');
    short = short.replace(new RegExp('/', 'g'), '-').replace(new RegExp('\\+', 'g'), '_');
    return short.slice(0, -1);
}

function decodeName(short) {
    short = short.replace(new RegExp('\\-', 'g'), '/').replace(new RegExp('_', 'g'), '+ ') + '=';
    return Buffer.from(short, 'base64').toString('hex');
}

/*
 * We sort clang containers before gcc containers.
 * If both are from the same compiler, we want the highest version (numerically, not alphabetically) first.
 */
function sortContainers(c1, c2) {
    if (c1.startsWith('clang')) {
        if (c2.startsWith('clang')) {
            let v1 = Number.parseFloat(c1.substr('clang-'.length));
            let v2 = Number.parseFloat(c2.substr('clang-'.length));
            return v2 - v1;
        } else {
            return -1;
        }
    } else {
        if (c2.startsWith('gcc')) {
            let v1 = Number.parseFloat(c1.substr('gcc-'.length));
            let v2 = Number.parseFloat(c2.substr('gcc-'.length));
            return v2 - v1;
        } else {
            return 1;
        }
    }
}

function readContainersList(stdout) {
    return stdout.split('\n').filter(Boolean).sort(sortContainers);
}

function listContainers(target) {
    exec('./list-containers', {}, (err, stdout, stderr) => {
         target.concat(readContainersList(stdout));
    });
}

exports.listContainers = listContainers;
exports.readContainersList = readContainersList;
exports.read = read;
exports.write =  write;
exports.encodeName =  encodeName;
exports.decodeName = decodeName;
