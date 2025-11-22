const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const _ = require('lodash');
const appsettings = JSON.parse(fs.readFileSync('./appsettings.json').toString());
const RESOURCES = JSON.parse(fs.readFileSync('./resources.json'));
const EBX_PATH = appsettings.EbxPath;
const MAIN_FOLDER_PATH = appsettings.mainFolder;
const ASSET_NAME = appsettings.assetName;
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
    SearchChunks(filePath, data);
    SearchResources(filePath, data);
}

function SearchPartitions(filePath, fileData) {
    const partition = fileData.toString()
        .split('\n').join('')
        .split('\r')
        .filter(row => row.includes("Partition "))[0];

    partitions.push(partition.split("Partition ")[1]);
}

function SearchResources(filePath, fileData) {
    console.log(`Searching Resources --> ${filePath}`);
    const bar = new ProgressBar(':bar :percent', { total: RESOURCES.length, width: 40 });
    for (let i = 0; i < RESOURCES.length; i++) {
        bar.tick();
        if (fileData.toLowerCase().indexOf(RESOURCES[i].Name.toLowerCase()) > -1) {
            resources.push({
                resourceName: RESOURCES[i].Name,
                resourceType: RESOURCES[i].TypeName,
            });
            bar.tick(bar.total - bar.curr);
        }
    }
}

function SearchChunks(filePath, fileData) {
    console.log(`Searching Chunks --> ${filePath}`);
    const rows = fileData.toString()
        .split(/\r?\n/).join('')
        .split('\t')
        .filter(row => GUID_REGEX.test(row));

    const bar = new ProgressBar(':bar :percent', { total: rows.length, width: 40 });
    for (let i = 0; i < rows.length; i++) {
        bar.tick();
        if (rows[i].includes("ChunkId")) {
            const chunkId = rows[i].split(' ')[1];
            if (chunks.findIndex(ch => ch == chunkId) == -1) {
                chunks.push(chunkId);
            }
        }
    }
}

async function GenerateRimeCommandFile(type) {
    //TODO: Implements
    switch (type) {
        case "get-meshset-chunk-ids":
            break;
        case "dump-all":
            break;
        case "build-new-bundle":
            break;
    }
}

function GetMeshSetChunks() {
    //TODO: Implement
}


function DumpAll() {
    //TODO: Implement
}

function BuildNewBundle() {
    //TODO: Implement
}

async function RunRimeBuilder() {
    //TODO: Implement
}

var mainFile = fs.readFileSync(EBX_PATH + MAIN_FOLDER_PATH + ASSET_NAME + '.txt');
SaveFiledata(path.join(ASSET_NAME, MAIN_FOLDER_PATH + ASSET_NAME + '.txt'), mainFile.toString());

var fileRows = GetReferencedFileNames(mainFile);

var savedPaths = []
while (fileRows.length > 0) {
    for (const row in fileRows) {
        let file = fs.readFileSync(path.join(EBX_PATH, fileRows[row]));
        SaveFiledata(path.join(ASSET_NAME, fileRows[row]), file.toString());
        savedPaths.push(...GetReferencedFileNames(file));
    }
    fileRows = [];
    fileRows = JSON.parse(JSON.stringify([...new Set(savedPaths)]));
    savedPaths = [];
}

(
    async () => {
        console.log('RunRimeBuilder');
        await RunRimeBuilder();
    }
)