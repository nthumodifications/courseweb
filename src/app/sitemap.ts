import { MetadataRoute } from 'next'
import { stops, routes } from '@/const/bus'
import { departments } from '@/const/departments'
import { semesterInfo } from '@/const/semester'
import supabase from '@/config/supabase'

const BASE_URL = 'https://nthumods.com'
const LANGS = ['en', 'zh'] as const
const NOW = new Date()

const staticPages = [
  { path: '/today', priority: 1.0, changeFreq: 'daily' as const },
  { path: '/courses', priority: 0.9, changeFreq: 'daily' as const },
  { path: '/timetable', priority: 0.8, changeFreq: 'weekly' as const },
  { path: '/venues', priority: 0.8, changeFreq: 'weekly' as const },
  { path: '/bus', priority: 0.8, changeFreq: 'daily' as const },
  { path: '/shops', priority: 0.7, changeFreq: 'weekly' as const },
  { path: '/apps', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/settings', priority: 0.3, changeFreq: 'monthly' as const },
  { path: '/team', priority: 0.4, changeFreq: 'monthly' as const },
  { path: '/issues', priority: 0.4, changeFreq: 'weekly' as const },
  { path: '/privacy-policy', priority: 0.3, changeFreq: 'yearly' as const },
]

const recentSemesterIds = new Set(semesterInfo.slice(-2).map(s => s.id))

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages — both languages
  for (const page of staticPages) {
    for (const lang of LANGS) {
      entries.push({
        url: `${BASE_URL}/${lang}${page.path}`,
        lastModified: NOW,
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternates: {
          languages: {
            en: `${BASE_URL}/en${page.path}`,
            zh: `${BASE_URL}/zh${page.path}`,
          },
        },
      })
    }
  }

  // Bus stops — derived from routes constants
  const allStopIds = new Set<string>()
  for (const route of routes) {
    for (const stopId of route.path) allStopIds.add(stopId)
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

  // Department index pages
  for (const dept of departments) {
    for (const lang of LANGS) {
      entries.push({
        url: `${BASE_URL}/${lang}/courses/dept/${dept.code}`,
        lastModified: NOW,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: {
            en: `${BASE_URL}/en/courses/dept/${dept.code}`,
            zh: `${BASE_URL}/zh/courses/dept/${dept.code}`,
          },
        },
      })
    }
  }

  // All course detail pages — fetched from Supabase
  // Recent semesters get higher priority; older ones are still indexed
  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('raw_id, semester')
      .order('semester', { ascending: false })

    if (courses) {
      for (const course of courses) {
        const isRecent = recentSemesterIds.has(course.semester)
        const courseEncoded = encodeURIComponent(course.raw_id)
        for (const lang of LANGS) {
          entries.push({
            url: `${BASE_URL}/${lang}/courses/${courseEncoded}`,
            lastModified: NOW,
            changeFrequency: isRecent ? 'monthly' : 'yearly',
            priority: isRecent ? 0.8 : 0.5,
            alternates: {
              languages: {
                en: `${BASE_URL}/en/courses/${courseEncoded}`,
                zh: `${BASE_URL}/zh/courses/${courseEncoded}`,
              },
            },
          })
        }
      }
    }
  } catch {
    // Sitemap degrades gracefully if DB is unreachable
  }

  return entries
}
