import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

if (process.env.NODE_ENV === "development") {
  await initOpenNextCloudflareForDev();
}

export default nextConfig;
