// PM2 process definition for the standalone Next.js server.
//
// `output: "standalone"` (next.config.mjs) disables `next start` and generates
// its own server at .next/standalone/server.js. That server reads its port from
// PORT and host from HOSTNAME (defaults: 3000 / localhost) — there is no -p flag.
//
// Prerequisite: run `npm run build` first. Its `postbuild` step copies
// .next/static and public/ into the standalone tree, which server.js needs in
// order to serve assets (otherwise every CSS/JS/image 404s).
//
//   pm2 start ecosystem.config.js   # first launch (or after `pm2 delete`)
//   pm2 restart spider-mania        # after a rebuild
//   pm2 save                        # persist across reboot
//
// PM2 snapshots env at create time, so change PORT here then `pm2 delete` +
// `pm2 start` (a plain restart keeps the old env unless you pass --update-env).
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "spider-mania",
      cwd: __dirname,
      script: path.join(__dirname, ".next", "standalone", "server.js"),
      env: {
        NODE_ENV: "production",
        PORT: 8004,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
