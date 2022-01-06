"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const exec_1 = require("@actions/exec");
const io_1 = require("@actions/io");
const fs_1 = __importDefault(require("fs"));
const artifact_1 = __importDefault(require("@actions/artifact"));
const options = {
    depListFilePath: "h5p-dependency-list-file",
};
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const projectName = github_1.context.repo.repo;
            yield (0, io_1.mkdirP)(projectName);
            // Move everything into the project directory
            // When doing this, the current project gets the
            // same structure as the dependencies. This is
            // crucial for the `h5p pack` command.
            yield (0, exec_1.exec)(`mv $(ls ./* | grep -v ./${projectName}) ./${projectName}`);
            const fallbackDepListFilePath = "build_info/repos";
            const dependencyListFilePath = (_a = (0, core_1.getInput)(options.depListFilePath)) !== null && _a !== void 0 ? _a : fallbackDepListFilePath;
            const useFallbackDepListFilePath = fallbackDepListFilePath === dependencyListFilePath;
            const dependencyListFileExists = fs_1.default.existsSync(dependencyListFilePath);
            if (dependencyListFileExists) {
                cloneDependencies(dependencyListFilePath);
            }
            else if (useFallbackDepListFilePath) {
                (0, core_1.debug)(`Could not find an H5P dependency file.`);
            }
            else {
                (0, core_1.setFailed)(`The provided H5P dependency file '${dependencyListFilePath}' could not be found.
         If it doesn't exist, please remove \`${options.depListFilePath}\` from the configuration.`);
                return;
            }
            yield npmBuildProjects();
            const library = yield getLibraryContents(projectName);
            if (!library) {
                return;
            }
            const version = getVersionString(library);
            const filename = getFilename(projectName, version);
            yield packH5P(filename);
            yield archiveH5PPack(filename);
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
function cloneDependencies(dependencyListFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, exec_1.exec)(`
  while read -r repo
  do
    git clone \${repo}
    echo "Repo: \${repo}"

  done < ${dependencyListFilePath}
`);
    });
}
function npmBuildProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, exec_1.exec)(`
    for dependency in */ ; do
      echo "Dependency name: \${dependency}"

      # Check if the project is actually a Node project and can be built
      if test -f "\${dependency}package.json"
      then 
        pushd \${dependency}
        npm install
        npm run build --if-present
        popd
      fi
    done
  `);
    });
}
function getLibraryContents(projectName) {
    return __awaiter(this, void 0, void 0, function* () {
        const libraryPath = `${projectName}/library.json`;
        const libraryExists = fs_1.default.existsSync(libraryPath);
        if (!libraryExists) {
            (0, core_1.setFailed)(`Could not find \`${libraryPath}\`.`);
            return null;
        }
        const libraryJson = (yield fs_1.default.promises.readFile(libraryPath)).toString("utf-8");
        return JSON.parse(libraryJson);
    });
}
function getVersionString(library) {
    const { majorVersion, minorVersion, patchVersion } = library;
    return `v${majorVersion}.${minorVersion}.${patchVersion}`;
}
function getFilename(projectName, version) {
    return `${projectName}_${version}.h5p`;
}
function packH5P(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, exec_1.exec)(`
    npm install -g h5p
    h5p pack -r h5p-editor-topic-map ${filename}
    h5p validate ${filename}
  `);
    });
}
function archiveH5PPack(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const artifactClient = artifact_1.default.create();
        yield artifactClient.uploadArtifact(filename, [filename], ".");
    });
}
run();
