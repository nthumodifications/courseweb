import type { College, Department, YearInfo } from "./types";

const MAIN_PAGE_URL =
  "https://registra.site.nthu.edu.tw/p/412-1211-1826.php?Lang=zh-tw";
const BASE_URL = "https://registra.site.nthu.edu.tw";

// Known college names (from main page)
const COLLEGE_NAMES = [
  "理學院",
  "工學院",
  "原子科學院",
  "人文社會學院",
  "生命科學暨醫學院",
  "電機資訊學院",
  "科技管理學院",
  "竹師教育學院",
  "藝術學院",
  "清華學院",
];

export async function scrapeMainPage(): Promise<
  { name: string; url: string }[]
> {
  const response = await fetch(MAIN_PAGE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NTHUMods/1.0)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch main page: ${response.status}`);
  }

  const html = await response.text();
  const colleges: { name: string; url: string }[] = [];

  // Parse HTML to find college links
  // Look for links containing college names
  for (const collegeName of COLLEGE_NAMES) {
    // Match pattern: <a href="...">學院名</a>
    const linkPattern = new RegExp(
      `<a[^>]*href=["']([^"']+)["'][^>]*>\\s*${collegeName}\\s*</a>`,
      "i",
    );
    const match = html.match(linkPattern);

    if (match) {
      let url = match[1];
      // Handle relative URLs
      if (url.startsWith("/")) {
        url = BASE_URL + url;
      } else if (!url.startsWith("http")) {
        url = BASE_URL + "/" + url;
      }

      colleges.push({ name: collegeName, url });
    }
  }

  // If links not found directly, try to find them in list format
  if (colleges.length === 0) {
    // Alternative parsing strategy
    const listItemPattern =
      /<li[^>]*>.*?<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let listMatch;

    while ((listMatch = listItemPattern.exec(html)) !== null) {
      const href = listMatch[1];
      const text = listMatch[2].trim();

      if (COLLEGE_NAMES.includes(text)) {
        let url = href;
        if (url.startsWith("/")) {
          url = BASE_URL + url;
        }
        colleges.push({ name: text, url });
      }
    }
  }

  return colleges;
}

export async function scrapeCollegePage(
  collegeUrl: string,
): Promise<Department[]> {
  const response = await fetch(collegeUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NTHUMods/1.0)",
      Accept: "text/html",
      Referer: MAIN_PAGE_URL,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch college page: ${response.status}`);
  }

  const html = await response.text();
  const departments: Department[] = [];

  // Parse HTML to find department sections with PDF links
  // Pattern: Department name followed by year-specific PDF links

  // Strategy 1: Look for <h3> or <h4> tags with department names followed by PDF links
  const sectionPattern =
    /<(h[234])[^>]*>([^<]+系[^<]*)<\/\1>([\s\S]*?)(?=<h[234]|$)/gi;
  let sectionMatch;

  while ((sectionMatch = sectionPattern.exec(html)) !== null) {
    const deptName = sectionMatch[2].trim();
    const sectionContent = sectionMatch[3];

    // Find PDF links within this section
    const pdfPattern =
      /<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>(\d{2,3})[^<]*[入學]*[年度]*<\/a>/gi;
    const years: YearInfo[] = [];
    let pdfMatch;

    while ((pdfMatch = pdfPattern.exec(sectionContent)) !== null) {
      let pdfUrl = pdfMatch[1];
      const year = pdfMatch[2];

      if (pdfUrl.startsWith("/")) {
        pdfUrl = BASE_URL + pdfUrl;
      } else if (!pdfUrl.startsWith("http")) {
        // Relative to college page
        const baseDir = collegeUrl.substring(
          0,
          collegeUrl.lastIndexOf("/") + 1,
        );
        pdfUrl = baseDir + pdfUrl;
      }

      years.push({ year, pdfUrl });
    }

    if (years.length > 0) {
      departments.push({
        name: deptName,
        years: years.sort((a, b) => parseInt(b.year) - parseInt(a.year)), // Newest first
      });
    }
  }

  // Strategy 2: If no departments found, try table-based layout
  if (departments.length === 0) {
    // Some pages use tables instead of sections
    const tableRowPattern =
      /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]*系[^<]*)<\/td>[\s\S]*?<\/tr>/gi;
    // ... implement table parsing if needed
  }

  return departments;
}

export async function scrapeAllColleges(): Promise<College[]> {
  const collegeLinks = await scrapeMainPage();
  const colleges: College[] = [];

  for (const { name, url } of collegeLinks) {
    try {
      const departments = await scrapeCollegePage(url);
      colleges.push({
        name,
        url,
        departments,
      });

      // Rate limiting to be nice to the server
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to scrape ${name}:`, error);
      // Continue with other colleges
      colleges.push({
        name,
        url,
        departments: [],
      });
    }
  }

  return colleges;
}

export async function findRequirementsPDF(
  colleges: College[],
  department: string, // Partial match in Chinese
  entranceYear: string,
): Promise<{ college: string; department: string; pdfUrl: string } | null> {
  for (const college of colleges) {
    for (const dept of college.departments) {
      // Partial match for department name
      if (dept.name.includes(department) || department.includes(dept.name)) {
        const yearInfo = dept.years.find((y) => y.year === entranceYear);
        if (yearInfo) {
          return {
            college: college.name,
            department: dept.name,
            pdfUrl: yearInfo.pdfUrl,
          };
        }
      }
    }
  }
  return null;
}
