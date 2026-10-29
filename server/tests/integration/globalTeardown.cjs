const { execFileSync } = require('node:child_process');

module.exports = async () => {
  if (process.env.HAPPIHUB_TEST_CONTAINER) execFileSync('docker', ['rm', '-f', process.env.HAPPIHUB_TEST_CONTAINER]);
};
