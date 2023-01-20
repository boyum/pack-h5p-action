import type { Library } from "h5p-types";

export function getVersionString(library: Library): string {
  const { majorVersion, minorVersion, patchVersion } = library;

  return `v${majorVersion}.${minorVersion}.${patchVersion}`;
}

export function getFilename(projectName: string, version: string): string {
  return `${projectName}_${version}.h5p`;
}
