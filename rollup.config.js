import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/cli/d2cli.ts",
  output: {
    file: "./dist/d2cli.cjs",
    format: "cjs"
  },
  plugins: [
    nodeResolve({
      exportConditions: ["node"], // add node option here,
      preferBuiltins: true
    }),
    commonjs(),
    json(),
    typescript({
      outputToFilesystem: true,
      compilerOptions: {
        declaration: false,
        declarationMap: false,
        sourceMap: false
      }
    })
  ]
};
