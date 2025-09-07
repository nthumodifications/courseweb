export const toPrettySemester = (semester: string) => {
  //from 11210 to 112-1
  const year = semester.slice(0, 3);
  const term = parseInt(semester.slice(3, 4));
  return `${year}-${term}`;
};
