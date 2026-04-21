import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/zh/student/',
          '/en/student/',
          '/zh/cds/',
          '/en/cds/',
          '/zh/ais-redirect/',
          '/en/ais-redirect/',
        ],
      },
    ],
    sitemap: 'https://nthumods.com/sitemap.xml',
    host: 'https://nthumods.com',
  }
}
