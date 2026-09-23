export type LaundryMachineType = "washer" | "dryer";
export type LaundryGender = "male" | "female" | "mixed";

export const LAUNDRY_DORMS = {
  義齋: { zh: "義齋", en: "Dorm Yi" },
  明齋: { zh: "明齋", en: "Dorm Ming" },
  實齋: { zh: "實齋", en: "Dorm Shyr" },
  新齋: { zh: "新齋", en: "Dorm Hsin" },
  華齋: { zh: "華齋", en: "Dorm Hua" },
  禮齋: { zh: "禮齋", en: "Dorm Li" },
  誠齋: { zh: "誠齋", en: "Dorm Cheng" },
  雅齋: { zh: "雅齋", en: "Dorm Ya" },
  慧齋: { zh: "慧齋", en: "Dorm Huei" },
  靜齋: { zh: "靜齋", en: "Dorm Jing" },
  碩齋: { zh: "碩齋", en: "Dorm Shuo" },
  仁齋: { zh: "仁齋", en: "Dorm Jen" },
  清華會館: { zh: "清華會館", en: "NTHU Guest House I" },
} as const;

export const LAUNDRY_AREAS = {
  義齋: { zh: "義齋", en: "Dorm Yi", dorm: "義齋" },
  明齋: { zh: "明齋", en: "Dorm Ming", dorm: "明齋" },
  實齋男: { zh: "實齋男", en: "Dorm Shyr (Male)", dorm: "實齋" },
  實齋女: { zh: "實齋女", en: "Dorm Shyr (Female)", dorm: "實齋" },
  新齋: { zh: "新齋", en: "Dorm Hsin", dorm: "新齋" },
  華齋: { zh: "華齋", en: "Dorm Hua", dorm: "華齋" },
  禮齋: { zh: "禮齋", en: "Dorm Li", dorm: "禮齋" },
  誠齋: { zh: "誠齋", en: "Dorm Cheng", dorm: "誠齋" },
  雅齋: { zh: "雅齋", en: "Dorm Ya", dorm: "雅齋" },
  慧齋: { zh: "慧齋", en: "Dorm Huei", dorm: "慧齋" },
  靜齋: { zh: "靜齋", en: "Dorm Jing", dorm: "靜齋" },
  碩齋: { zh: "碩齋", en: "Dorm Shuo", dorm: "碩齋" },
  仁齋男: { zh: "仁齋男", en: "Dorm Jen (Male)", dorm: "仁齋" },
  仁齋女: { zh: "仁齋女", en: "Dorm Jen (Female)", dorm: "仁齋" },
  "清華會館 9F": {
    zh: "清華會館 9F",
    en: "NTHU Guest House I · 9F",
    dorm: "清華會館",
  },
  "清華會館 B1": {
    zh: "清華會館 B1",
    en: "NTHU Guest House I · B1",
    dorm: "清華會館",
  },
} as const;

export type LaundryDorm = keyof typeof LAUNDRY_DORMS;
export type LaundryArea = keyof typeof LAUNDRY_AREAS;

export interface LaundryMachine {
  mac: string;
  dorm: LaundryDorm;
  area: LaundryArea;
  slug: string;
  gender: LaundryGender;
  type: LaundryMachineType;
  number: number;
}

type LaundryMachineArea = {
  area: LaundryArea;
  dorm: LaundryDorm;
  slug: string;
  gender: LaundryGender;
  washers: readonly string[];
  dryers: readonly string[];
};

const LAUNDRY_MACHINE_AREAS: readonly LaundryMachineArea[] = [
  {
    area: "義齋",
    dorm: "義齋",
    slug: "yi",
    gender: "mixed",
    washers: [
      "94c96001b307",
      "94c96001b306",
      "94c96001b2d1",
      "94c96001b3da",
      "94c96001b35d",
      "94c96001b371",
      "94c96001b389",
      "94c96001b3e0",
    ],
    dryers: [
      "94c96001b3df",
      "94c96001b3e2",
      "94c96001b395",
      "94c96001b39e",
      "94c96001b380",
    ],
  },
  {
    area: "清華會館 9F",
    dorm: "清華會館",
    slug: "tsinghua_hall",
    gender: "mixed",
    washers: ["94c96001b2d3", "94c96001b30c"],
    dryers: ["94c96001b311"],
  },
  {
    area: "清華會館 B1",
    dorm: "清華會館",
    slug: "tsinghua_hall",
    gender: "mixed",
    washers: ["94c96001b310"],
    dryers: ["94c96001b2d4"],
  },
  {
    area: "明齋",
    dorm: "明齋",
    slug: "ming",
    gender: "mixed",
    washers: ["94c96001b30e", "94c96001b2e0", "94c96001b2e1"],
    dryers: ["94c96001b3bd", "94c96001b3c1", "94c96001b3b8"],
  },
  {
    area: "新齋",
    dorm: "新齋",
    slug: "hsin",
    gender: "mixed",
    washers: ["94c96001b38f", "94c96001b391", "94c96001b369"],
    dryers: ["94c96001b358", "94c96001b328"],
  },
  {
    area: "華齋",
    dorm: "華齋",
    slug: "hua",
    gender: "mixed",
    washers: [
      "94c96001b349",
      "94c96001b359",
      "94c96001b3c5",
      "94c96001b3dd",
      "94c96001b3d7",
      "94c96001b3c6",
      "94c96001b3d4",
    ],
    dryers: [
      "94c96001b3d0",
      "94c96001b3d1",
      "94c96001b3d5",
      "94c96001b3d6",
      "94c96001b3e4",
    ],
  },
  {
    area: "禮齋",
    dorm: "禮齋",
    slug: "li",
    gender: "mixed",
    washers: [
      "94c96001b35f",
      "94c96001b366",
      "94c96001b367",
      "94c96001b392",
      "94c96001b390",
      "94c96001b354",
    ],
    dryers: ["94c96001b35e", "94c96001b352", "94c96001b35b", "94c96001b357"],
  },
  {
    area: "實齋男",
    dorm: "實齋",
    slug: "shyr",
    gender: "male",
    washers: ["94c96001b3ce", "94c96001b3c9", "94c96001b3c2", "94c96001b3cc"],
    dryers: ["94c96001b39f", "94c96001b396", "94c96001b38b"],
  },
  {
    area: "靜齋",
    dorm: "靜齋",
    slug: "jing",
    gender: "mixed",
    washers: ["94c96001b3a1", "94c96001b3a3", "94c96001b3a9", "94c96001b393"],
    dryers: ["94c96001b394", "94c96001b3e8"],
  },
  {
    area: "碩齋",
    dorm: "碩齋",
    slug: "shuo",
    gender: "mixed",
    washers: [
      "94c96001b3d9",
      "94c96001b3ef",
      "94c96001b3ee",
      "94c96001b3ff",
      "94c96001b3d8",
      "94c96001b3dc",
    ],
    dryers: ["94c96001b3af", "94c96001b399", "94c96001b398", "94c96001b3aa"],
  },
  {
    area: "實齋女",
    dorm: "實齋",
    slug: "shyr",
    gender: "female",
    washers: ["94c96001b43e", "94c96001b3a2", "94c96001b3e1", "94c96001b3ae"],
    dryers: ["94c96001b3b9", "94c96001b43d"],
  },
  {
    area: "慧齋",
    dorm: "慧齋",
    slug: "huei",
    gender: "mixed",
    washers: ["94c96001b3a8", "94c96001b3ec", "94c96001b3ea"],
    dryers: ["94c96001b3e7", "94c96001b3e6"],
  },
  {
    area: "雅齋",
    dorm: "雅齋",
    slug: "ya",
    gender: "mixed",
    washers: ["94c96001b3e9", "94c96001b3b0", "94c96001b3eb", "94c96001b3d2"],
    dryers: ["94c96001b3c7", "94c96001b3d3", "94c96001b3ca", "94c96001b3cd"],
  },
  {
    area: "誠齋",
    dorm: "誠齋",
    slug: "cheng",
    gender: "mixed",
    washers: [
      "94c96001b3c8",
      "94c96001b3fe",
      "94c96001b3bc",
      "94c96001b3c0",
      "94c96001b3fd",
    ],
    dryers: ["94c96001b3bf", "94c96001b3fc", "94c96001b3bb", "94c96001b3c3"],
  },
  {
    area: "仁齋男",
    dorm: "仁齋",
    slug: "jen",
    gender: "male",
    washers: ["94c96001b3e3", "94c96001b3f4", "94c96001b3f6", "94c96001b3f5"],
    dryers: ["94c96001b3cb", "94c96001b400"],
  },
  {
    area: "仁齋女",
    dorm: "仁齋",
    slug: "jen",
    gender: "female",
    washers: ["94c96001b3f3", "94c96001b3f2", "94c96001b3ed"],
    dryers: ["94c96001b3f1", "94c96001b3f0"],
  },
];

function createAreaMachines(area: LaundryMachineArea): LaundryMachine[] {
  return [
    ...area.washers.map((mac, index) => ({
      mac,
      dorm: area.dorm,
      area: area.area,
      slug: area.slug,
      gender: area.gender,
      type: "washer" as const,
      number: index + 1,
    })),
    ...area.dryers.map((mac, index) => ({
      mac,
      dorm: area.dorm,
      area: area.area,
      slug: area.slug,
      gender: area.gender,
      type: "dryer" as const,
      number: index + 1,
    })),
  ];
}

function compareMachineMacs(
  left: LaundryMachine,
  right: LaundryMachine,
): number {
  if (left.mac < right.mac) return -1;
  if (left.mac > right.mac) return 1;
  return 0;
}

export const LAUNDRY_MACHINES: readonly LaundryMachine[] =
  LAUNDRY_MACHINE_AREAS.flatMap(createAreaMachines).sort(compareMachineMacs);

export const LAUNDRY_MACHINES_BY_AREA = Object.fromEntries(
  (Object.keys(LAUNDRY_AREAS) as LaundryArea[]).map((area) => [
    area,
    LAUNDRY_MACHINES.filter((machine) => machine.area === area),
  ]),
) as unknown as Record<LaundryArea, readonly LaundryMachine[]>;
