"use server";

import { writeFile } from "fs/promises";
import { parseHTML } from "linkedom";

export const getStudentCourses = async (ACIXSTORE: string) => {
  const baseURL =
    "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/R/6.3/JH8R63002.php?ACIXSTORE=";
  const html = await fetch(baseURL + ACIXSTORE)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  const window = parseHTML(html);
  const doc = window.document;
  const table = Array.from(doc.querySelectorAll("table")).find((n) =>
    (n.textContent!.trim() ?? "").startsWith("學號 Student Number"),
  );

  if (!table) {
    return null;
  }
  //First Row:  學號 Student Number：{studentid}　　姓名 Name：{name_zh}　　班級 Department & Class：{class_name_zh}
  //Second Row p:  修習總學分(包含及格,不及格及成績未到) Total credits( including passing, failing, and not submitted grades)：{total_credits}　已修及格畢業學分 Passing grade：{passed_credits}　成績未到畢業學分 Not submitted grade：{pending_credits}
  //Third Row: Header
  //Fourth Row: Data(year, semester, course_id, course_name, credits, grade, ge_type, ranking, t_scores)
  //Last Row: same as second row

  //extract student info
  const student_info = table.querySelector("tr")?.textContent!.trim(); //regex to extract student info
  const student_info_regex =
    /學號 Student Number：(?<studentid>.+)　　姓名 Name：(?<name_zh>.+)　　班級 Department & Class：(?<class_name_zh>.+)/;
  const student_info_match = student_info?.match(student_info_regex);
  const student = {
    studentid: student_info_match?.groups?.studentid,
    name_zh: student_info_match?.groups?.name_zh,
    class_name_zh: student_info_match?.groups?.class_name_zh,
  };

  //Extract Grades
  const rows = table.querySelectorAll("tr");
  const courses = [];
  for (let i = 3; i < rows.length - 1; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll("td");
    // console.log(cells[0].innerHTML);
    const year = cells[0].textContent!.trim();
    const semester = cells[1].textContent!.trim();
    const course_id = cells[2].textContent!.trim()!;
    const course_name_raw = cells[3].textContent!.trim().split("\n")!;
    const name_zh_ge = course_name_raw?.[0]?.trim() ?? "";
    const name_en = course_name_raw?.[2]?.trim() ?? "";
    const credits = parseInt(cells[4].textContent!.trim() ?? "0");
    const grade_text = cells[5].textContent!.trim();
    const grade = !grade_text?.startsWith("成績未到") ? grade_text : "成績未到";
    const ge_type = cells[6]
      .textContent!.trim()
      .replace("Elective GE course:", "");
    const ranking = cells[7].querySelector("div")?.textContent!.trim();
    // console.log(cells[7].firstChild);
    const t_scores = cells[8].textContent!.trim();
    const [name_zh, ge_description] = name_zh_ge.split(" -- ");
    if (course_id == "ZZ 000000") continue;
    courses.push(`${year}${semester}${course_id}`);
  }

  return {
    student,
    courses,
  };
};

export const getLatestCourses = async (ACIXSTORE: string) => {
  const html1 = await fetch(
    `https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.1/JH721002.php?ACIXSTORE=${ACIXSTORE}`,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "frame",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    },
  )
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  const dom1 = parseHTML(html1);
  const doc1 = dom1.document;
  const semester = Array.from(
    doc1.querySelectorAll("select")[0].querySelectorAll("option"),
  )[1].value;
  const phaseArr = Array.from(
    doc1.querySelectorAll("select")[1].querySelectorAll("option"),
  );
  const phase = phaseArr[phaseArr.length - 1].value;
  const stu_no = (doc1.querySelector("input[name=stu_no]") as HTMLInputElement)
    .value;
  console.log(semester, phase, stu_no);

  const html = await fetch(
    "https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.1/JH721003.php",
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        "sec-ch-ua":
          '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "frame",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: `ACIXSTORE=${ACIXSTORE}&stu_no=${stu_no}&act=on&sem_changed=&semester=${encodeURIComponent(semester)}&phase=${phase}&Submit=%BDT%A9w+go`,
      method: "POST",
      mode: "cors",
      credentials: "include",
    },
  )
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  const dom = parseHTML(html);
  const doc = dom.document;
  const raw_ids = Array.from(
    doc.querySelectorAll("table")[1].querySelectorAll("tbody > .class3"),
  ).map((n) => n.children[0].textContent);

  return {
    semester: semester.split(",").join(""),
    phase,
    studentid: stu_no,
    courses: raw_ids,
  };
};

export const getLatestCourseEnrollment = async (
  ACIXSTORE: string,
  dept: string,
) => {
  const html = await fetch(
    "https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.2/7.2.7/JH727002.php",
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        "sec-ch-ua":
          '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "frame",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: `ACIXSTORE=${ACIXSTORE}&select=${dept}&act=1&Submit=%BDT%A9w+go`,
      method: "POST",
      mode: "cors",
      credentials: "include",
    },
  )
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  const window = parseHTML(html);
  const doc = window.document;

  const table = doc.querySelector(".sortable");

  if (!table) {
    throw new Error("No table found on " + dept);
  }

  const headerCells = table.querySelectorAll("tr.class2 td");
  const hasGeType = Array.from(headerCells).some((cell) =>
    (cell.textContent ?? "").includes("通識類別"),
  );

  const rows = table.querySelectorAll("tr.word");
  const courses = Array.from(rows).map((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length > 0) {
      const course = {
        courseNumber: cells[0].textContent!.trim(),
        courseName: cells[1].textContent!.trim(),
        professor: cells[2].textContent!.trim(),
        classTime: cells[hasGeType ? 4 : 3].textContent!.trim(),
        sizeLimit: cells[hasGeType ? 5 : 4].textContent!.trim(),
        currentNumber: cells[hasGeType ? 6 : 5].textContent!.trim(),
        currentSpotsRemaining: cells[hasGeType ? 7 : 6].textContent!.trim(),
        toBeRandomed: cells[hasGeType ? 8 : 7].textContent!.trim(),
        ...(!hasGeType ? {} : { geType: cells[3].textContent!.trim() }),
      };

      return course;
    }
  });

  return courses;
};

export const getHiddenCourseSelectionCode = async (
  ACIXSTORE: string,
  dept: string,
) => {
  const html = await fetch(
    "https://www.ccxp.nthu.edu.tw/ccxp/COURSE/JH/7/7.1/7.1.3/JH713004.php",
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "content-type": "application/x-www-form-urlencoded",
        "sec-ch-ua":
          '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "frame",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: `ACIXSTORE=${ACIXSTORE}&toChk=1&new_dept=${dept}&new_class=EECS111B++&chks=%A5%B2%BF%EF%AD%D7&aspr=&ckey=&code=&div=&real=&cred=&ctime=&num=&glimit=&type=&pre=&range=&chkbtn=`,
      method: "POST",
      mode: "cors",
      credentials: "include",
    },
  )
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  console.log(html);
  const window = parseHTML(html);
  const doc = window.document;
  const buttons = doc.querySelectorAll('input[type="button"][value="加ADD"]');

  const courses = Array.from(buttons)
    .map((button) => {
      const onClick = button.getAttribute("onClick")!;
      const matches = onClick.match(
        /checks\(this\.form,\s*'([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'\s*\);/,
      );

      if (matches) {
        const [
          ,
          ckey,
          code,
          div,
          real,
          cred,
          ctime,
          num,
          glimit,
          type,
          pre,
          range,
        ] = matches;

        return {
          ckey,
          code,
          div,
          real,
          cred,
          ctime,
          num,
          glimit,
          type,
          pre,
          range,
        };
      }
      return null;
    })
    .filter((course) => course !== null);

  return courses;
};

export const getClassDetailed = async (ACIXSTORE: string) => {
  console.log(ACIXSTORE);
  const html = await fetch(
    `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/TDM/1/1.1/TDM1110.php?ACIXSTORE=${ACIXSTORE}`,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "sec-ch-ua":
          '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        referer: `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/IN_INQ_STU.php?ACIXSTORE=${ACIXSTORE}`,
      },
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    },
  )
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) =>
      new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
    );
  const { document: doc } = parseHTML(html, "text/html");

  const targetElement = doc.querySelector(
    'td[height="30"] font[color="#0180FE"]',
  );
  const targetText = targetElement?.textContent?.trim() ?? "Text not found";
  console.log(doc.documentElement.innerHTML);
  let degreeType = "";
  let year = "";
  let department = "";

  if (targetText !== "Text not found") {
    const cleanedText = targetText.replace(/　/g, " ").trim();

    const degreeTypes = ["大學部", "碩士班", "博士班"];

    for (let type of degreeTypes) {
      if (cleanedText.includes(type)) {
        degreeType = type;
        break;
      }
    }

    if (degreeType) {
      const parts = cleanedText.split(degreeType);
      department = parts[0].trim();

      const yearMatch = parts[1].match(/\d+/);
      year = yearMatch ? yearMatch[0] : "";
    } else {
      department = cleanedText;
    }
  }

  return {
    department: department,
    degreeType: degreeType,
    year: year,
  };
};
