import { MetadataRoute } from 'next'
import { stops, routes } from '@/const/bus'

const BASE_URL = 'https://nthumods.com'
const LANGS = ['en', 'zh'] as const
const NOW = new Date()

const staticPages = [
  { path: '/today', priority: 1.0 },
  { path: '/courses', priority: 0.9 },
  { path: '/timetable', priority: 0.8 },
  { path: '/venues', priority: 0.8 },
  { path: '/bus', priority: 0.8 },
  { path: '/shops', priority: 0.7 },
  { path: '/apps', priority: 0.6 },
  { path: '/settings', priority: 0.5 },
  { path: '/team', priority: 0.4 },
  { path: '/issues', priority: 0.4 },
  { path: '/privacy-policy', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  // Static pages for each language
  for (const page of staticPages) {
    entries.push({
      url: `${BASE_URL}/zh${page.path}`,
      lastModified: NOW,
      changeFrequency: page.priority >= 0.9 ? 'daily' : page.priority >= 0.7 ? 'weekly' : 'monthly',
      priority: page.priority,
      alternates: {
        languages: {
          en: `${BASE_URL}/en${page.path}`,
          zh: `${BASE_URL}/zh${page.path}`,
        },
      },
    })
    entries.push({
      url: `${BASE_URL}/en${page.path}`,
      lastModified: NOW,
      changeFrequency: page.priority >= 0.9 ? 'daily' : page.priority >= 0.7 ? 'weekly' : 'monthly',
      priority: page.priority,
      alternates: {
        languages: {
          en: `${BASE_URL}/en${page.path}`,
          zh: `${BASE_URL}/zh${page.path}`,
        },
      },
    })
  }

  // Bus stop pages - derive all stop IDs from routes
  const allStopIds = new Set<string>()
  for (const route of routes) {
    for (const stopId of route.path) {
      allStopIds.add(stopId)
    }
  }

  for (const stopId of allStopIds) {
    for (const lang of LANGS) {
      entries.push({
        url: `${BASE_URL}/${lang}/bus/stop/${stopId}`,
        lastModified: NOW,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: {
          languages: {
            en: `${BASE_URL}/en/bus/stop/${stopId}`,
            zh: `${BASE_URL}/zh/bus/stop/${stopId}`,
          },
        },
      })
    }
  }

  return entries
}
