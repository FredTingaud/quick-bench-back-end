var exec = require('child_process').exec;
const fetch = require('node-fetch');

const getToken = async () => {
    const response = await fetch('https://auth.docker.io/token?service=registry.docker.io&scope=repository:fredtingaud/quick-bench:pull');
    const auth = await response.json();
    return auth['token'];
};

const getTags = async () => {
    const token = await getToken();
    const response = await fetch(/*'https://registry.hub.docker.com/v2/repositories/fredtingaud/quick-bench/tags/?page=1');*/'https://registry-1.docker.io/v2/fredtingaud/quick-bench/tags/list', {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        }
    });
    const json = await response.json();
    return json['tags'];
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

function readContainersList(stdout) {
    return stdout.split('\n').filter(Boolean).sort(sortContainers);
}

function listContainers(target) {
    exec('./list-containers', {}, (err, stdout, stderr) => {
        target.concat(readContainersList(stdout));
    });
}

function loadContainers(targetList) {
    targetList.forEach(t => exec('docker pull fredtingaud/quick-bench:' + t));
}

exports.listContainers = listContainers;
exports.readContainersList = readContainersList;
exports.getTags = getTags;
exports.loadContainers = loadContainers;
