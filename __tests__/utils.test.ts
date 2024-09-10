import { describe, expect, it } from "@jest/globals";
import { getFilename, getVersionString } from "../src/utils";

describe("Utils", () => {
  describe(getVersionString.name, () => {
    it("should return the library's version on the form `vx.y.z`", () => {
      const library = {
        title: "test",
        machineName: "test",
        majorVersion: 0,
        minorVersion: 1,
        patchVersion: 2,
      };

      const expected = "v0.1.2";
      const actual = getVersionString(library);

      expect(actual).toBe(expected);
    });
  });

  describe(getFilename.name, () => {
    it("should return the H5P pack filename on the form `{projectName}_{version}.h5p`", () => {
      const projectName = "h5p-test";
      const version = "v0.1.2";

      const expected = `${projectName}_${version}.h5p`;
      const actual = getFilename(projectName, version);

      expect(actual).toBe(expected);
    });
  });
});
