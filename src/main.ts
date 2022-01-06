import artifact from "@actions/artifact";
import { debug, getInput, setFailed, setOutput } from "@actions/core";
import { exec } from "@actions/exec";
import { context } from "@actions/github";
import { mkdirP } from "@actions/io";
import fs from "fs";
import { Library } from "./h5p/types/library";
import { getFilename, getVersionString } from "./utils";

const options = {
  depListFilePath: "h5p-dependency-list-file",
};

const outputs = {
  filePath: "filePath",
  version: "version",
};

async function run(): Promise<void> {
  try {
    const projectName = context.repo.repo;
    await mkdirP(projectName);

    // Move everything into the project directory
    // When doing this, the current project gets the
    // same structure as the dependencies. This is
    // crucial for the `h5p pack` command.
    await exec(`mv '$(ls ./* | grep -v ./${projectName})' ./${projectName}`);

    const fallbackDepListFilePath = "build_info/repos";
    const dependencyListFilePath =
      getInput(options.depListFilePath) ?? fallbackDepListFilePath;

    const useFallbackDepListFilePath =
      fallbackDepListFilePath === dependencyListFilePath;

    const dependencyListFileExists = fs.existsSync(dependencyListFilePath);
    if (dependencyListFileExists) {
      cloneDependencies(dependencyListFilePath);
    } else if (useFallbackDepListFilePath) {
      debug(`Could not find an H5P dependency file.`);
    } else {
      setFailed(
        `The provided H5P dependency file '${dependencyListFilePath}' could not be found.
         If it doesn't exist, please remove \`${options.depListFilePath}\` from the configuration.`,
      );
      return;
    }

    await npmBuildProjects();

    const library = await getLibraryContents(projectName);
    if (!library) {
      return;
    }

    const version = getVersionString(library);
    const filename = getFilename(projectName, version);
    await packH5P(filename);

    await archiveH5PPack(filename);

    setOutput(outputs.filePath, filename);
    setOutput(outputs.version, version);
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed((error as Object).toString());
    }
  }
}

async function cloneDependencies(
  dependencyListFilePath: string,
): Promise<void> {
  await exec(`
  while read -r repo
  do
    git clone \${repo}
    echo "Repo: \${repo}"

  done < ${dependencyListFilePath}
`);
}

async function npmBuildProjects(): Promise<void> {
  await exec(`
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
}

async function getLibraryContents(
  projectName: string,
): Promise<Library | null> {
  const libraryPath = `${projectName}/library.json`;
  const libraryExists = fs.existsSync(libraryPath);
  if (!libraryExists) {
    setFailed(`Could not find \`${libraryPath}\`.`);
    return null;
  }

  const libraryJson = (await fs.promises.readFile(libraryPath)).toString(
    "utf-8",
  );
  return JSON.parse(libraryJson) as Library;
}

async function packH5P(filename: string): Promise<void> {
  await exec(`
    npm install -g h5p
    h5p pack -r h5p-editor-topic-map ${filename}
    h5p validate ${filename}
  `);
}

async function archiveH5PPack(filename: string): Promise<void> {
  const artifactClient = artifact.create();
  await artifactClient.uploadArtifact(filename, [filename], ".");
}

run();
