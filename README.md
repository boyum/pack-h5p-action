# H5P Pack Action

This action packs the H5P content type and its dependencies, then archives the `.h5p` file as an artifact.

## Prerequisites

For simple H5P content types with no dependencies, there are none. However, if the content type has dependencies that you'd like to build into the H5P pack, you'll need to create a file that contains the Git URIs of the dependencies, as such:

`build_info/repos`:

```txt
https://github.com/h5p/h5p-dependency-1.git
https://github.com/my-username/h5p-dependency-2.git
```

The default file name is `repos` within the `build_info` directory, however this can be specified with the `h5p-dependency-list-file` option.

## Examples

### Pack and archive the H5P content type

```yml
name: Pack and archive content type

on: [push]

jobs:
  pack-and-archive:
    runs-on: ubuntu-latest
    name: Pack and archive
    steps:
      - uses: actions/checkout@v3
      - uses: boyum/pack-h5p-action@1
```

### Custom dependency path

```yml
name: Pack and archive content type

on: [push]

jobs:
  pack-and-archive:
    runs-on: ubuntu-latest
    name: Pack and archive
    steps:
      - uses: actions/checkout@v3
      - uses: boyum/pack-h5p-action@1
        with:
          h5p-dependency-list-file: h5p-dependencies.txt
```

### Release after pack

```yml
name: Pack and release content type

on: [push]

jobs:
  pack-and-release:
    runs-on: ubuntu-latest
    name: Pack and release
    steps:
      - uses: actions/checkout@v3
      - uses: boyum/pack-h5p-action@1
        id: release-h5p
      - uses: "marvinpinto/action-automatic-releases@latest" # https://github.com/marvinpinto/actions/tree/master/packages/automatic-releases
        if: ${{ github.ref == 'refs/heads/main' }}
        with:
          repo_token: "${{ secrets.GITHUB_TOKEN }}"
          automatic_release_tag: ${{steps.release-h5p.outputs.version}}
          prerelease: false
          files: |
            ${{steps.release-h5p.outputs.filePath}}
```

## Options

| Name | Required | Default value | Description |
|---|---|---|---|
| `h5p-dependency-list-file` | false | `build_info/repos` | The file where dependency Git URIs are found. Must be omitted if the file does not exist. |
| `working-directory` | false | `.` | The directory where `library.json` is found.  |

## Outputs

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | The path to the archived file |
| `version` | `string` | The content type's version on the form `vx.y.z` |
