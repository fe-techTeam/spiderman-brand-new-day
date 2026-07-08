/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle consumed by the Dockerfile (see DEPLOYMENT.md).
  output: "standalone",

  // Pin the workspace root. `output: standalone` writes a package-lock.json into
  // .next/standalone, and with other lockfiles around the filesystem Turbopack
  // would otherwise infer the wrong root mid-build and fail the build.
  turbopack: { root: import.meta.dirname },

  // Keep mysql2 as a real node_modules require instead of bundling it — its
  // dynamic requires (auth plugins, charsets) don't survive bundling, and this
  // also ships it in the standalone trace for scripts/migrate.js. (bcryptjs is
  // handled in the Dockerfile: it's a dual ESM/CJS package whose CJS entry the
  // trace omits, so the full package is copied in for scripts/seed-admin.js.)
  serverExternalPackages: ["mysql2"],

  poweredByHeader: false,

  // Version-skew protection behind CloudFront: asset URLs get ?dpl=<id> and a
  // mismatched client hard-reloads instead of loading chunks from an older
  // build. Set DEPLOYMENT_ID at image build time (e.g. the git SHA).
  deploymentId: process.env.DEPLOYMENT_ID || undefined,

  async headers() {
    return [
      {
        // BACKEND.md §5.5 baseline security headers.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // public/ files get no Cache-Control from Next by default. Branding
        // assets change rarely and aren't content-hashed, so: browsers keep
        // them a day, CloudFront serves stale for a week while revalidating.
        // (/_next/static is already immutable — Next hard-codes that header.)
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
