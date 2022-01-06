export type Library = {
  title: string;
  machineName: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  runnable?: number;
  preloadedJs?: Array<{path: string}>;
  preloadedCss?: Array<{path: string}>;
  preloadedDependencies?: Array<{
    machineName: string;
    majorVersion: number;
    minorVersion: number;
  }>;
};
