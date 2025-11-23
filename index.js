const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const _ = require('lodash');
const appsettings = JSON.parse(fs.readFileSync('./appsettings.json').toString());
const RESOURCES = JSON.parse(fs.readFileSync('./resources.json'));
const EBX_PATH = appsettings.EbxPath;
const GUID_REGEX = /[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}/;
const PATH_BEFORE_GUID_REGEX = /\/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}/;
const resources = [];
const chunks = [];
const partitions = [];

function GetReferencedFileNames(file) {
    const rows = file.toString()
        .split(/\r?\n/).join('')
        .split('\t')
        .filter(row => GUID_REGEX.test(row) && PATH_BEFORE_GUID_REGEX.test(row) && row.includes("ResourceName") == false);

    const fileNames = rows.map(row => {
        let path = row.split('/');
        path.pop();
        let firstPartOfPath = path[0].split(' ')[1];
        path.shift();
        path.unshift(firstPartOfPath);
        return path.join('/') + '.txt'
    }).filter(Boolean);

    const uniqueData = [...new Set(fileNames)];
    return uniqueData;
}

function SaveFiledata(filePath, data) {
    SearchPartitions(filePath, data);
    SearchResources(filePath, data);
    //SearchChunks(filePath, data);
}

function SearchPartitions(filePath, fileData) {
    let splitted = filePath.split('.txt');
    splitted = splitted[0];
    partitions.push(splitted);
}

function SearchResources(filePath, fileData) {
    for (let i = 0; i < RESOURCES.length; i++) {
        if (fileData.toLowerCase().indexOf(RESOURCES[i].Name.toLowerCase()) > -1) {
            resources.push({
                resourceName: RESOURCES[i].Name,
                resourceType: RESOURCES[i].TypeName,
            });
        }
    }
}

// function SearchChunks(filePath, fileData) {
//     const rows = fileData.toString()
//         .split(/\r?\n/).join('')
//         .split('\t')
//         .filter(row => GUID_REGEX.test(row));

//     for (let i = 0; i < rows.length; i++) {
//         if (rows[i].includes("ChunkId")) {
//             const chunkId = rows[i].split(' ')[1];
//             if (chunks.findIndex(ch => ch == chunkId) == -1) {
//                 chunks.push(chunkId);
//             }
//         }
//     }
// }


const bar = new ProgressBar(':bar :percent', { total: appsettings.assets.length, width: 40 });
for (const asset of appsettings.assets) {
    bar.tick()
    var mainFile = fs.readFileSync(path.join(EBX_PATH, asset));
    SaveFiledata(path.join(asset), mainFile.toString());

    var fileRows = GetReferencedFileNames(mainFile);
    var savedPaths = []
    while (fileRows.length > 0) {
        for (const row in fileRows) {
            let file = fs.readFileSync(path.join(EBX_PATH, fileRows[row]));
            if (fileRows[row].includes("Materials/MaterialContainer") == false) {
                SaveFiledata(fileRows[row], file.toString());
                savedPaths.push(...GetReferencedFileNames(file));
            }
        }
        fileRows = [];
        fileRows = JSON.parse(JSON.stringify([...new Set(savedPaths)]));
        savedPaths = [];
    }
}

fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync('./output/partitions.json', JSON.stringify(partitions, null, 2));
fs.writeFileSync('./output/chunks.json', JSON.stringify(chunks, null, 2));
fs.writeFileSync('./output/resources.json', JSON.stringify(resources, null, 2));