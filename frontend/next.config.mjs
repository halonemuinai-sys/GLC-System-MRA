import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/docs'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withNextra(nextConfig);


