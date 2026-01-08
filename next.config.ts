import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  cacheComponents: true,

  // Add Sass options
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
    quietDeps: true, // hides deprecation warnings from node_modules like Bootstrap
  },
};

export default nextConfig;
