import { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { departments } from '@/const/departments'
import { lastSemester, semesterInfo } from '@/const/semester'
import supabase from '@/config/supabase'
import { toPrettySemester } from '@/helpers/semester'
import JsonLd from '@/components/JsonLd'
import { LangProps } from '@/types/pages'

type Props = {
    params: { department: string; lang: string }
}

export const dynamicParams = true

export async function generateStaticParams() {
    return departments.map(d => ({ department: d.code }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const dept = departments.find(d => d.code === params.department)
    if (!dept) return { title: '找不到系所', robots: { index: false, follow: false } }

    const title = `${dept.name_zh} ${dept.code} 課程查詢`
    const description = `查詢國立清華大學${dept.name_zh}（${dept.name_en}）所有課程，包含課程名稱、教師與時段。Browse all NTHU ${dept.name_en} courses.`
    const url = `https://nthumods.com/${params.lang}/courses/dept/${dept.code}`

    return {
        title,
        description,
        keywords: [
            `清大${dept.name_zh}課程`,
            `NTHU ${dept.name_en} courses`,
            `清大${dept.code}`,
            `${dept.name_zh}選課`,
            `NTHU ${dept.code}`,
            '國立清華大學課程',
        ],
        openGraph: {
            title: `${title} | NTHUMods`,
            description,
            url,
        },
        twitter: {
            card: 'summary',
            title: `${title} | NTHUMods`,
            description,
        },
        alternates: {
            canonical: url,
            languages: {
                en: `https://nthumods.com/en/courses/dept/${dept.code}`,
                zh: `https://nthumods.com/zh/courses/dept/${dept.code}`,
            },
        },
    }
}

const getCoursesForDept = async (deptCode: string) => {
    const semesters = semesterInfo.map(s => s.id)
    const { data, error } = await supabase
        .from('courses')
        .select('raw_id, name_zh, name_en, teacher_zh, semester, course, class')
        .eq('department', deptCode)
        .in('semester', semesters)
        .order('semester', { ascending: false })
        .order('course', { ascending: true })
    if (error) return []
    return data ?? []
}

const DepartmentPage = async ({ params }: Props & LangProps) => {
    const dept = departments.find(d => d.code === params.department)
    if (!dept) return (
        <div className="py-6 px-4">
            <h1 className="text-2xl font-bold">找不到系所</h1>
            <Link href={`/${params.lang}/courses`} className="text-blue-500 underline mt-2 block">
                回課程查詢
            </Link>
        </div>
    )

    const courses = await getCoursesForDept(params.department)

    // Group by semester
    const bySemester: Record<string, typeof courses> = {}
    for (const c of courses) {
        if (!bySemester[c.semester]) bySemester[c.semester] = []
        bySemester[c.semester].push(c)
    }
    const semestersDesc = Object.keys(bySemester).sort((a, b) => b.localeCompare(a))

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: '課程查詢', item: `https://nthumods.com/${params.lang}/courses` },
            { '@type': 'ListItem', position: 2, name: `${dept.name_zh} ${dept.code}`, item: `https://nthumods.com/${params.lang}/courses/dept/${dept.code}` },
        ],
    }

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${dept.name_zh} 課程列表`,
        description: `國立清華大學${dept.name_zh}（${dept.name_en}）課程列表`,
        numberOfItems: courses.length,
        itemListElement: courses.slice(0, 100).map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${c.name_zh} ${c.name_en ?? ''}`.trim(),
            url: `https://nthumods.com/${params.lang}/courses/${encodeURIComponent(c.raw_id)}`,
        })),
    }

    return (
        <div className="py-6 px-4 max-w-4xl">
            <JsonLd data={breadcrumbJsonLd} />
            <JsonLd data={itemListJsonLd} />

            <nav className="text-sm text-gray-500 mb-4">
                <Link href={`/${params.lang}/courses`} className="hover:underline">課程查詢</Link>
                <span className="mx-2">/</span>
                <span>{dept.name_zh} {dept.code}</span>
            </nav>

            <h1 className="text-2xl font-bold mb-1">{dept.name_zh}</h1>
            <h2 className="text-base text-gray-500 mb-1">{dept.name_en}</h2>
            <p className="text-sm text-gray-400 mb-6">{courses.length} 門課程</p>

            <Link
                href={`/${params.lang}/courses?department[0]=${dept.code}`}
                className="inline-block mb-6 px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
                進階篩選與搜尋 →
            </Link>

            <div className="space-y-8">
                {semestersDesc.map(semId => (
                    <section key={semId}>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                            {toPrettySemester(semId)} 學期
                        </h3>
                        <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {bySemester[semId].map(course => (
                                <li key={course.raw_id}>
                                    <Link
                                        href={`/${params.lang}/courses/${encodeURIComponent(course.raw_id)}`}
                                        className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 hover:bg-gray-50 dark:hover:bg-neutral-900 px-2 -mx-2 rounded"
                                    >
                                        <span className="text-xs font-mono text-purple-600 dark:text-purple-400 w-20 shrink-0">
                                            {params.department} {course.course}-{course.class}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                                            {course.name_zh}
                                        </span>
                                        {course.name_en && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {course.name_en}
                                            </span>
                                        )}
                                        {course.teacher_zh && course.teacher_zh.length > 0 && (
                                            <span className="text-xs text-gray-400 shrink-0">
                                                {course.teacher_zh.join(', ')}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    )
}

export default DepartmentPage
