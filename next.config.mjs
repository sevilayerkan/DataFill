const repoName = "datafill";
const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  poweredByHeader: false,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Project Pages URL: https://sevilayerkan.github.io/datafill/
  ...(isGithubPages ? { basePath: `/${repoName}` } : {}),
};

export default nextConfig
