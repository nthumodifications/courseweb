/**
 * @file 通識課程目標代碼
 * @module src/const/ge_target.ts
 * @version 1.0.0
 * @see https://curricul.site.nthu.edu.tw/p/404-1208-11133.php
 * @description 通識課程目標代碼, 除了 *1, *3, *7 以外, 其他代碼已經不再使用
 */

export const GETargetCodes = [
  {
    code: "*1",
    short_zh: "無限制",
    short_en: "Unrestricted",
    description_zh: "各系學生可做為通識學分課程",
    description_en:
      "For all students all credits are accepted as General Education.",
  },
  // {
  //     code: '*2',
  //     short_zh: '限人文社會學院學生',
  //     short_en: 'Only HSS students',
  //     description_zh: '限人文社會學院學生做為通識學分課程，其他（院）系學生不得選修。',
  //     description_en: 'Credits are accepted as General Education but only for students of Humanities and Social Sciences.'
  // },
  {
    code: "*3",
    short_zh: "開課系所/院學生非通識",
    short_en: "Not GE for students of the department/college",
    description_zh:
      "全校學生皆可選修；但開課系(所)所屬(院)學生選修，不列入通識課程學分",
    description_en:
      "For all students the credits are accepted as General Education but not for the students registered in the same departments or colleges which offer the courses.",
  },
  // {
  //     code: '*4',
  //     short_zh: '限非開課系所/院學生',
  //     short_en: 'Only students not registered in the department/college',
  //     description_zh: '開課系（所）所屬學院學生不可選修，其他（院）系學生可做為通識學分課程。',
  //     description_en: 'Only selectable for students who are not registered in the department or college which offer the courses and credits are accepted as General Education.'
  // },
  // {
  //     code: '*5',
  //     short_zh: '限非開課系所學生',
  //     short_en: 'Only students not registered in the department',
  //     description_zh: '開課系(所)之學生不可選修，其他系(所)學生可選修',
  //     description_en: 'Only selectable for students who are not registered in the department which offers the courses and credits are accepted as General Education. '
  // },
  {
    code: "*6",
    short_zh: "師資培育中心學生非通識",
    short_en: "Not GE for Teacher Education Center Students",
    description_zh:
      "師資培育中心開設課程，非修習教育學程學生可選修且列入通識課程學分",
    description_en:
      "Students not registered for the teacher education program can take courses marked with *6 offered by the Teacher Education Center, and the credits are accepted as General Education. ",
  },
  {
    code: "*7",
    short_zh: "開課系所學生非通識",
    short_en: "Not GE for students of the department",
    description_zh:
      "全校學生皆可選修；但開課系(所)之學生選修，不列入通識課程學分",
    description_en:
      "For all students the credits are accepted as General Education but not for the students registered in the same department which offer the courses.",
  },
];

// 109學年度起	通識向度別	        108學年度(含)前	通識向度別
// 向度一	思維、文明與歷史	      向度一	思維方式
// 向度二	生命、自然與科技	      向度二	生命之探索
// 向度三	藝術、文學與創意設計       向度三	藝術與文學
// 向度四	公民、社會與世界	      向度四	社會與文化脈動
// --	--	                        向度五	科學、技術與社會
// --	--	                        向度六	歷史分析

export const GECTypes = [
  "核心通識Core GE courses 1",
  "核心通識Core GE courses 2",
  "核心通識Core GE courses 3",
  "核心通識Core GE courses 4",
];
