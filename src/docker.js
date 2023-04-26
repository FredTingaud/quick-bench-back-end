var exec = require('child_process').exec;
const fetch = require('node-fetch');

const getToken = async () => {
    const response = await fetch('https://auth.docker.io/token?service=registry.docker.io&scope=repository:fredtingaud/quick-bench:pull');
    const auth = await response.json();
    return auth['token'];
};

const getTags = async () => {
    const token = await getToken();
    const response = await fetch('https://registry-1.docker.io/v2/fredtingaud/quick-bench/tags/list', {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        }
    });
    const json = await response.json();
    return json['tags'].sort(sortContainers);
};

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

function describeContainer(name) {
    return new Promise((resolve, reject) => {
        return exec('./about-container ' + name, {}, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                let result = {name: name};
                let title = '';
                for (const l of stdout.split('\n')) {
                    const line = l.trim();
                    if (line === "") {
                        continue;
                    }
                    if (line.startsWith('[') && line.endsWith(']')){
                        title = line.substring(1, line.length - 1);
                        result[title] = [];
                    } else {
                        result[title].push(line)
                    }
                }
                resolve(result);
            };
        });
    });
}

function readContainersList(stdout) {
    return stdout.split('\n').filter(Boolean).sort(sortContainers);
}

function listContainers(target) {
    return new Promise((resolve, reject) => {
        return exec('./list-containers', {}, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    }).then(stdout => {
        return Promise.all(readContainersList(stdout).map(c => describeContainer(c)));
    }).then(m => {
        console.log(JSON.stringify(m));
        target.push(...m);
    }).catch(e => console.log(`Failed listing containers: JSON.stringify(e)`));
}

function loadOneContainer(container) {
    return new Promise((resolve, reject) => {
        return exec('docker pull fredtingaud/quick-bench:' + container, {}, function (err, stdout, stderr) {
            if (err) {
                reject(stderr);
            } else {
                resolve();
            }
        });
    });
}

function deleteOneContainer(container) {
    return new Promise((resolve, reject) => {
        return exec('docker rmi fredtingaud/quick-bench:' + container, {}, function (err, stdout, stderr) {
            if (err) {
                reject(stderr);
            } else {
                resolve();
            }
        });
    });
}

async function loadContainers(targetList) {
    await Promise.all(targetList.map(t => loadOneContainer(t)));
}

async function deleteContainers(targetList) {
    await Promise.all(targetList.map(t => deleteOneContainer(t)));
}

exports.listContainers = listContainers;
exports.readContainersList = readContainersList;
exports.getTags = getTags;
exports.loadContainers = loadContainers;
exports.deleteContainers = deleteContainers;
