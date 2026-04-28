/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
    // node-cron ve firebase-admin Node.js modülleridir — bundle edilmez, require() ile yüklenir
    serverComponentsExternalPackages: [
      "node-cron",
      "firebase-admin",
      "firebase-admin/app",
      "firebase-admin/firestore",
    ],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (!isServer) {
      // Browser bundle: Node.js built-in'leri boş modül olarak çöz
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        url: false,
        util: false,
        events: false,
        buffer: false,
        querystring: false,
      };
    }

    if (nextRuntime === "edge") {
      // Edge runtime: Node.js built-in'leri ve firebase-admin ekosistemini bundle etme
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...existing,
        /^firebase-admin/,
        /^@google-cloud\//,
        /^google-auth-library/,
        /^gaxios/,
        /^google-gax/,
        /^node-cron/,
        // node: prefixli built-in'leri commonjs'e map et
        function ({ request }, callback) {
          if (request && request.startsWith("node:")) {
            return callback(null, "commonjs " + request.slice(5));
          }
          callback();
        },
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
