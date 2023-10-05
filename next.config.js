
const withPWA = require('next-pwa')({
    dest: 'public'
})

  
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig);
