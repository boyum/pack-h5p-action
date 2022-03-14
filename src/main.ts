import { create as createArtifactClient } from "@actions/artifact";
import { getInput, info, setFailed, setOutput } from "@actions/core";
import { exec } from "@actions/exec";
import { context } from "@actions/github";
import { mkdirP } from "@actions/io";
import fs from "fs";
import path from "path";
import { Library } from "./h5p/types/library";
import { getFilename, getVersionString } from "./utils";

const options = {
  depListFilePath: "h5p-dependency-list-file",
  workingDirectory: "working-directory",
};

const outputs = {
  filePath: "filePath",
  version: "version",
};

async function run(): Promise<void> {
  try {
    const workingDirectory = getInput(options.workingDirectory) || "";
    const projectName = context.repo.repo;
    const rootDir = path.join(workingDirectory);

    info(`Creating directory '${projectName}' in ${rootDir}`);

    const projectDir = path.join(rootDir, projectName);
    await mkdirP(projectDir);
    await moveAllFilesButDirectoryIntoDirectory(rootDir, projectName);

    const fallbackDepListFilePath = "build_info/repos";
    const dependencyListFilePath =
      getInput(options.depListFilePath) || fallbackDepListFilePath;

    const useFallbackDepListFilePath =
      fallbackDepListFilePath === dependencyListFilePath;

    const dependencyListFileExists = fs.existsSync(
      path.join(projectDir, dependencyListFilePath),
    );
    if (dependencyListFileExists) {
      await cloneDependencies(projectName, rootDir, dependencyListFilePath);
    } else if (useFallbackDepListFilePath) {
      info(`Could not find an H5P dependency file.`);
    } else {
      setFailed(
        `The provided H5P dependency file '${dependencyListFilePath}' could not be found.
         If it doesn't exist, please remove \`${options.depListFilePath}\` from the configuration.`,
      );
      return;
    }

    await npmBuildProjects(rootDir);

    const library = await getLibraryContents(rootDir, projectName);
    if (!library) {
      return;
    }

    const version = getVersionString(library);
    const filename = getFilename(projectName, version);
    await packH5P(projectName, filename, rootDir);

    await archiveH5PPack(filename, rootDir);

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

async function moveAllFilesButDirectoryIntoDirectory(
  rootDir: string,
  destinationDirectory: string,
): Promise<void> {
  const contents = await fs.promises.readdir(rootDir);
  const contentsExceptDestDir = contents.filter(
    fileOrDir => fileOrDir !== destinationDirectory,
  );

  info(`Contents: ${JSON.stringify(contents)}`);

  // Move everything into the project directory.
  // When doing this, the current project gets the
  // same structure as the dependencies. This is
  // crucial for the `h5p pack` command.
  await Promise.all(
    contentsExceptDestDir.map(async fileOrDir => {
      info(`Moving ${fileOrDir} into ${destinationDirectory}`);
      await fs.promises.rename(
        `${rootDir}/${fileOrDir}`,
        `${rootDir}/${destinationDirectory}/${fileOrDir}`,
      );
    }),
  );
}

async function cloneDependencies(
  projectName: string,
  rootDir: string,
  dependencyListFilePath: string,
): Promise<number[]> {
  info(`Cloning dependencies from '${dependencyListFilePath}'`);

  const dependencyFile = (
    await fs.promises.readFile(
      `${rootDir}/${projectName}/${dependencyListFilePath}`,
    )
  ).toString("utf-8");

  const dependencies = [
    ...new Set(
      dependencyFile
        .split("\n")
        .filter(dependencyName => dependencyName.trim().length > 0),
    ),
  ];

  info(`Dependencies: ${JSON.stringify(dependencies)}`);

  return Promise.all(
    dependencies.map(async dependency =>
      exec(`git clone ${dependency}`, undefined, {
        cwd: rootDir,
      }),
    ),
  );
}

async function npmBuildProject(projectPath: string): Promise<void> {
  const isNodeProject = fs.existsSync(`${projectPath}/package.json`);
  if (isNodeProject) {
    try {
      await exec("npm install", undefined, { cwd: projectPath });
      await exec("npm run build --if-present", undefined, {
        cwd: projectPath,
      });

      Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    return Promise.resolve();
  }
}

async function npmBuildProjects(rootDir: string): Promise<void[]> {
  const projects = await fs.promises.readdir(rootDir);
  info(`Building projects: ${projects}`);

  return Promise.all(
    projects.map(async project => {
      const projectPath = `${rootDir}/${project}`;
      return npmBuildProject(projectPath);
    }),
  );
}

async function getLibraryContents(
  rootDir: string,
  projectName: string,
): Promise<Library | null> {
  const projectDir = path.join(rootDir, projectName);

  info("Fetching library contents");
  info(`Contents in root: ${await fs.promises.readdir(rootDir)}`);
  info(`Contents in root/project: ${await fs.promises.readdir(projectDir)}`);

  const libraryPath = path.join(projectDir, "library.json");
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

async function packH5P(
  projectName: string,
  filename: string,
  rootDir: string,
): Promise<void> {
  info(`Packing H5P into file '${filename}'`);

  await exec("npm install -g h5p");
  await exec(`h5p pack -r ${projectName} ${filename}`, undefined, {
    cwd: rootDir,
  });
  await exec(`h5p validate ${filename}`, undefined, { cwd: rootDir });
}

async function archiveH5PPack(
  filename: string,
  rootDir: string,
): Promise<void> {
  info(`Archiving H5P into file '${filename}'`);

  const artifactClient = createArtifactClient();
  await artifactClient.uploadArtifact(
    filename,
    [path.join(rootDir, filename)],
    ".",
  );
}

run();
