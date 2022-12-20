const loadEnvConfig = require('@next/env').loadEnvConfig;

const silent = () => {};
const silentLogger = {log: silent, info: silent, error: silent};
loadEnvConfig(process.env.PWD, false, silentLogger);
