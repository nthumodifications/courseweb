export type OpenStatus = [boolean, string, string?];

const DAY_KEYS = [
  "sunday",
  "weekday",
  "weekday",
  "weekday",
  "weekday",
  "weekday",
  "saturday",
] as const;

export const getTodayKey = () => DAY_KEYS[new Date().getDay()];

const HOUR = 3600 * 1000;
const CLOSED = "休息中";
const NO_INFO: OpenStatus = [false, "無資訊"];

// Multi-day schedules look like "週一至週五:11:00-20:00、週六:11:00-14:00".
const DAY_TIMESLOT = {
  weekday: /(?<=[週周]一[~至][週周]五:?)\d{1,2}:\d{1,2}-\d{1,2}:\d{1,2}(?=、)/,
  saturday: /(?<=[週周]六:?)\d{2}:\d{2}-\d{2}:\d{2}/,
  sunday: /(?<=[週周]日:?)\d{2}:\d{2}-\d{2}:\d{2}/,
};
// Some weekday entries are written "11:00:20:00" instead of "11:00-20:00".
const COLON_SEPARATED_WEEKDAY =
  /(?<=[週周]一[~至][週周]五:?)\d{1,2}:\d{1,2}:\d{1,2}:\d{1,2}(?=、)/;

const timeToday = (time: string) => {
  const date = new Date();
  date.setHours(
    Number.parseInt(time.split(":")[0]),
    Number.parseInt(time.split(":")[1]),
    0,
  );
  return date;
};

const checkRange = (start: string, end: string): OpenStatus => {
  const startDate = timeToday(start);
  const endDate = timeToday(end);
  const now = new Date();
  const opensSoon: OpenStatus = [false, "即將開始", start + "開始營業"];

  if (now < startDate && startDate.valueOf() - now.valueOf() < HOUR) {
    return opensSoon;
  }
  if (now > startDate && now < endDate) {
    return endDate.valueOf() - now.valueOf() < HOUR
      ? [true, "即將休息", end + "後休息"]
      : [true, "營業中", end + "後休息"];
  }
  if (now > endDate) return [false, CLOSED];
  if (now < endDate) return opensSoon;
  return NO_INFO;
};

const checkSlot = (slot: string) => {
  const [start, end] = slot.split("-");
  return checkRange(start, end);
};

export const checkOpen = (schedule: string): OpenStatus => {
  if (schedule == "24小時") {
    return [true, "營業中", "24小時營業"];
  }
  if (schedule == "") {
    return [false, "今日休息"];
  }
  if (schedule.includes("、")) {
    const today = getTodayKey();
    if (today == "weekday" && COLON_SEPARATED_WEEKDAY.test(schedule)) {
      schedule = schedule.replace(/(\d{1,2}:\d{2}):(\d{1,2}:\d{2})/, "$1-$2");
    }
    const timeslot = DAY_TIMESLOT[today].exec(schedule);
    return timeslot ? checkSlot(timeslot[0]) : NO_INFO;
  }
  if (schedule.includes(",")) {
    // A split day ("11:00-14:00,17:00-20:00"): the first slot that is not
    // already over decides the status.
    for (const slot of schedule.split(",")) {
      const status = checkSlot(slot.trim());
      if (status[1] !== CLOSED) return status;
    }
  }
  if (schedule.includes("-")) {
    return checkSlot(schedule);
  }
  return NO_INFO;
};
