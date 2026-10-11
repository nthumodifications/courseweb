export const getRangeOfDays = (start: Date, end: Date) => {
  const days = [];
  const date = new Date(start);
  while (date <= end) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};
