import './sourcemap-register.cjs';/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const artifact_1 = require("@actions/artifact");
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const github_1 = require("@actions/github");
const io_1 = require("@actions/io");
const utils_1 = require("./utils");
const options = {
    depListFilePath: "h5p-dependency-list-file",
    workingDirectory: "working-directory",
};
const outputs = {
    filePath: "filePath",
    version: "version",
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const workingDirectory = (0, core_1.getInput)(options.workingDirectory) || "";
            const projectName = github_1.context.repo.repo;
            const rootDir = path_1.default.join(workingDirectory);
            (0, core_1.info)(`Creating directory '${projectName}' in ${rootDir}`);
            const projectDir = path_1.default.join(rootDir, projectName);
            yield (0, io_1.mkdirP)(projectDir);
            yield moveAllFilesButDirectoryIntoDirectory(rootDir, projectName);
            const fallbackDepListFilePath = "build_info/repos";
            const dependencyListFilePath = (0, core_1.getInput)(options.depListFilePath) || fallbackDepListFilePath;
            const useFallbackDepListFilePath = fallbackDepListFilePath === dependencyListFilePath;
            const dependencyListFileExists = fs_1.default.existsSync(path_1.default.join(projectDir, dependencyListFilePath));
            if (dependencyListFileExists) {
                yield cloneDependencies(projectName, rootDir, dependencyListFilePath);
            }
            else if (useFallbackDepListFilePath) {
                (0, core_1.info)(`Could not find an H5P dependency file.`);
            }
            else {
                (0, core_1.setFailed)(`The provided H5P dependency file '${dependencyListFilePath}' could not be found.
         If it doesn't exist, please remove \`${options.depListFilePath}\` from the configuration.`);
                return;
            }
            yield npmBuildProjects(rootDir);
            const library = yield getLibraryContents(rootDir, projectName);
            if (!library) {
                return;
            }
            const version = (0, utils_1.getVersionString)(library);
            const filename = (0, utils_1.getFilename)(projectName, version);
            yield packH5P(projectName, filename, rootDir);
            yield archiveH5PPack(filename, rootDir);
            (0, core_1.setOutput)(outputs.filePath, filename);
            (0, core_1.setOutput)(outputs.version, version);
        }
        catch (error) {
            if (error instanceof Error) {
                (0, core_1.setFailed)(error.message);
            }
            else {
                (0, core_1.setFailed)(error.toString());
            }
        }
    });
}
function moveAllFilesButDirectoryIntoDirectory(rootDir, destinationDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        const contents = yield fs_1.default.promises.readdir(rootDir);
        const contentsExceptDestDir = contents.filter(fileOrDir => fileOrDir !== destinationDirectory);
        (0, core_1.info)(`Contents: ${JSON.stringify(contents)}`);
        // Move everything into the project directory.
        // When doing this, the current project gets the
        // same structure as the dependencies. This is
        // crucial for the `h5p pack` command.
        yield Promise.all(contentsExceptDestDir.map((fileOrDir) => __awaiter(this, void 0, void 0, function* () {
            (0, core_1.info)(`Moving ${fileOrDir} into ${destinationDirectory}`);
            yield fs_1.default.promises.rename(`${rootDir}/${fileOrDir}`, `${rootDir}/${destinationDirectory}/${fileOrDir}`);
        })));
    });
}
function cloneDependencies(projectName, rootDir, dependencyListFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.info)(`Cloning dependencies from '${dependencyListFilePath}'`);
        const dependencyFile = (yield fs_1.default.promises.readFile(`${rootDir}/${projectName}/${dependencyListFilePath}`)).toString("utf-8");
        const dependencies = [
            ...new Set(dependencyFile
                .split("\n")
                .filter(dependencyName => dependencyName.trim().length > 0)
                .filter(dependencyName => !dependencyName.startsWith("#"))),
        ];
        (0, core_1.info)(`Dependencies: ${JSON.stringify(dependencies, null, 2)}`);
        return Promise.all(dependencies.map((dependency) => __awaiter(this, void 0, void 0, function* () {
            return (0, exec_1.exec)(`git clone ${dependency}`, undefined, {
                cwd: rootDir,
                // eslint-disable-next-line github/no-then
            }).catch((error) => __awaiter(this, void 0, void 0, function* () {
                let errorMessage = `Failed to clone ${dependency}: ${error}`;
                switch (error) {
                    case "Error: The process '/usr/bin/git' failed with exit code 128":
                        errorMessage = `Failed to clone ${dependency}: The repository is probably either deleted or private. ${error}`;
                        break;
                }
                (0, core_1.setFailed)(errorMessage);
                return Promise.reject(error);
            }));
        })));
    });
}
function npmBuildProject(projectPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const isNodeProject = fs_1.default.existsSync(`${projectPath}/package.json`);
        if (isNodeProject) {
            try {
                (0, core_1.info)(`Installing dependencies in ${projectPath}`);
                yield (0, exec_1.exec)("npm install", undefined, { cwd: projectPath });
                (0, core_1.info)(`Building project in ${projectPath}`);
                yield (0, exec_1.exec)("npm run build --if-present", undefined, {
                    cwd: projectPath,
                });
                Promise.resolve();
            }
            catch (error) {
                return Promise.reject(error);
            }
        }
        else {
            return Promise.resolve();
        }
    });
}
function npmBuildProjects(rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield fs_1.default.promises.readdir(rootDir);
        (0, core_1.info)(`Building projects: ${projects}`);
        return Promise.all(projects.map((project) => __awaiter(this, void 0, void 0, function* () {
            const projectPath = `${rootDir}/${project}`;
            return npmBuildProject(projectPath);
        })));
    });
}
function getLibraryContents(rootDir, projectName) {
    return __awaiter(this, void 0, void 0, function* () {
        const projectDir = path_1.default.join(rootDir, projectName);
        (0, core_1.info)("Fetching library contents");
        (0, core_1.info)(`Contents in root: ${yield fs_1.default.promises.readdir(rootDir)}`);
        (0, core_1.info)(`Contents in root/project: ${yield fs_1.default.promises.readdir(projectDir)}`);
        const libraryPath = path_1.default.join(projectDir, "library.json");
        const libraryExists = fs_1.default.existsSync(libraryPath);
        if (!libraryExists) {
            (0, core_1.setFailed)(`Could not find \`${libraryPath}\`.`);
            return null;
        }
        const libraryJson = (yield fs_1.default.promises.readFile(libraryPath)).toString("utf-8");
        return JSON.parse(libraryJson);
    });
}
function packH5P(projectName, filename, rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.info)(`Packing H5P into file '${filename}'`);
        yield (0, exec_1.exec)("npm install -g h5p");
        yield (0, exec_1.exec)(`h5p pack -r ${projectName} ${filename}`, undefined, {
            cwd: rootDir,
        });
        yield (0, exec_1.exec)(`h5p validate ${filename}`, undefined, { cwd: rootDir });
    });
}
function archiveH5PPack(filename, rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.info)(`Archiving H5P into file '${filename}'`);
        const artifactClient = (0, artifact_1.create)();
        yield artifactClient.uploadArtifact(filename, [path_1.default.join(rootDir, filename)], ".");
    });
}
run();


//# sourceMappingURL=index.js.map