import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sms/ui', '@sms/utils', '@sms/api-client'],
};

export default nextConfig;
