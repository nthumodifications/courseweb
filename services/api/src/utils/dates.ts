export const getRangeOfDays = (start: Date, end: Date) => {
  const days = [];
  for (let i = start.getTime(); i <= end.getTime(); i += 86400000) {
    days.push(new Date(i));
  }
  return days;
};
