const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
  fallbacks: {
    document: "/zh/offline",
  },
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // NOTE: This ignores type errors during build. Only enable if you're confident
    // your code is type-safe (e.g., run tsc separately in CI)
    ignoreBuildErrors: true,
  },
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: "./empty-module.ts",
      },
    },
  },
  webpack: (config, { webpack, isServer }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false,
        __RRWEB_EXCLUDE_IFRAME__: true,
        __RRWEB_EXCLUDE_SHADOW_DOM__: true,
        __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
      }),
    );

    // Fix for PDF.js canvas dependency issue
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^canvas$/,
        contextRegExp: /pdf/,
      }),
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
      };
    }

    // return the modified config
    return config;
  },
  output: "standalone",
};

const { withSentryConfig } = require("@sentry/nextjs");

const sentryConfig = withSentryConfig(
  withPWA(nextConfig),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: "nthumods",
    project: "courseweb",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  },
);

module.exports = withBundleAnalyzer(sentryConfig);
