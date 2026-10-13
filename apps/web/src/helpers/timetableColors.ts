type DepartmentCourse = {
  raw_id: string;
  department: string;
};

export const groupColorsByDepartment = <T extends DepartmentCourse>(
  previousColorMap: Record<string, string>,
  semesterCourses: T[],
  colors: string[],
): Record<string, string> => {
  const newColorMap = { ...previousColorMap };
  const departments: string[] = [];

  for (const course of semesterCourses) {
    if (!departments.includes(course.department)) {
      departments.push(course.department);
    }
  }

  for (const course of semesterCourses) {
    const departmentIndex = departments.indexOf(course.department);
    newColorMap[course.raw_id] = colors[departmentIndex % colors.length];
  }

  return newColorMap;
};
