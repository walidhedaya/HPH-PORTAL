const { spawnSync } = require("child_process");

const result = spawnSync(process.execPath, ["scripts/run-migrations.js"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
