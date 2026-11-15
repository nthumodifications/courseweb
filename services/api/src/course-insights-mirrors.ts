// Worker-local projections of packages/shared course insight lookup data.
// course-insights-mirrors.test.ts keeps these synchronized with the source.

export const COURSE_INSIGHT_SEMESTERS = [
  {
    id: "10810",
    year: 2019,
    semester: 1,
  },
  {
    id: "10820",
    year: 2019,
    semester: 2,
  },
  {
    id: "10910",
    year: 2020,
    semester: 1,
  },
  {
    id: "10920",
    year: 2020,
    semester: 2,
  },
  {
    id: "11010",
    year: 2021,
    semester: 1,
  },
  {
    id: "11020",
    year: 2021,
    semester: 2,
  },
  {
    id: "11110",
    year: 2022,
    semester: 1,
  },
  {
    id: "11120",
    year: 2022,
    semester: 2,
  },
  {
    id: "11210",
    year: 2023,
    semester: 1,
  },
  {
    id: "11220",
    year: 2023,
    semester: 2,
  },
  {
    id: "11310",
    year: 2024,
    semester: 1,
  },
  {
    id: "11320",
    year: 2024,
    semester: 2,
  },
  {
    id: "11410",
    year: 2025,
    semester: 1,
  },
  {
    id: "11420",
    year: 2025,
    semester: 2,
  },
  {
    id: "11510",
    year: 2026,
    semester: 1,
  },
] as const;

export const COURSE_INSIGHT_BUILDINGS = [
  [
    "醫環",
    "BMES",
    "生醫工程及環境科學館",
    "Biomedical Engineering and Environmental Sciences Building",
  ],
  [
    "計中",
    "CC",
    "第二綜合大樓(計通中心)",
    "General Building II (Computer & Communication Center)",
  ],
  ["化工", "CHE", "化工館", "Chemical Engineering Building"],
  ["化", "CHEM", "化學館", "Chemistry Building"],
  [
    "化二",
    "CHEM II",
    "動機化學實驗館(化學二館)",
    "Chemistry and Power Mechanical Engineering Building",
  ],
  ["諮商", "Counsel", "醫輔中心", "Clinic and Counseling Center"],
  ["台達", "DELTA", "台達館", "Delta Building"],
  ["仁齋", "D-Ren", "仁齋", "Dormitory Ren"],
  ["實齋", "D-Shi", "實齋", "Dormitory Shi"],
  ["教", "EDU", "教育館", "Education Building"],
  [
    "資電",
    "EECS",
    "資訊電機館",
    "Electrical Engineering and Computer Science Building",
  ],
  ["工一", "ENG I", "工程一館", "Engineering Building I"],
  ["工科", "ESS", "工科館", "Engineering and System Science Building"],
  ["綜一", "GEN I", "第一綜合大樓", "General Building I"],
  ["綜二", "GEN II", "第二綜合大樓", "General Building II"],
  ["綜三", "GEN III", "第三綜合大樓", "General Building III"],
  ["綜四", "GEN IV", "第四綜合大樓", "General Building IV"],
  ["人社", "HSS", "人文社會學院", "Humanities and Social Sciences Building"],
  ["生一", "LS I", "生命科學一館", "Life Science Building I"],
  ["生二", "LS II", "生命科學二館", "Life Science Building II"],
  ["綠能", "LTM", "綠能大樓(李存敏館)", "Lee Tsen Min Building"],
  ["材料", "MS", "材料科技館", "Materials Science and Technology Building"],
  ["材實", "MSLAB", "材料實驗館", "Materials Science Laboratory"],
  [
    "旺宏",
    "MXIC",
    "旺宏館(學習資源中心)",
    "MXIC Building(Learning Resource Center)",
  ],
  ["清實", "NTHU Lab", "清華實驗室", "Tsing Hua Laboratory"],
  ["物", "PHYS", "物理館", "Physics Building"],
  ["普實", "PHYSLAB", "普物實驗館", "Physics Laboratory"],
  ["蒙民", "STC", "學生活動中心", "Student Union"],
  ["台積", "TSMC", "台積館", "TSMC Building"],
  ["中研院", "SINICA", "北市南港區中研院", "Academia Sinica"],
  ["南大", "Nanda", "南大校區", "Nanda Campus"],
  ["虛擬教室", "VC", "線上進行課程,無實體教室", "Virtual classroom"],
] as const;

export const getCourseInsightBuildingDefinition = (venue: string) => {
  const venueKey = [...venue]
    .filter((character) => /[\u4e00-\u9fff]/u.test(character))
    .join("");
  const definition = COURSE_INSIGHT_BUILDINGS.find(
    ([candidateKey]) => candidateKey === venueKey,
  );
  if (!definition) return undefined;

  const [key, code, nameZh, nameEn] = definition;
  return { venueKey: key, code, nameZh, nameEn };
};
