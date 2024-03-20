const { withSentryConfig } = require("@sentry/nextjs");
const million = require("million/compiler");

const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    cacheStartUrl: true,
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,  
    dynamicStartUrlRedirect: '/zh/today',
    workboxOptions: {
      disableDevLogs: true,
    },
    fallbacks: {
      document: '/zh/offline',
    }
})

/** @type {import('next').NextConfig} */
const nextConfig = {
}

const millionConfig = {
  auto: true,// if you're using RSC: auto: { rsc: true },
};

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
  }
);

module.exports = million.next(sentryConfig, millionConfig)