import { db } from "@/config/firebase";
import { CourseLocalStorage } from "@/hooks/contexts/useUserTimetable";
import { collection, Timestamp } from "firebase/firestore";

type FirebaseUserDoc = {
  courses: CourseLocalStorage;
  colorMap: Record<string, string>;
  lastUpdated: Timestamp;
};

export const userCol = collection(db, "users").withConverter<FirebaseUserDoc>({
  toFirestore: (data) => data,
  fromFirestore: (snap) => snap.data() as FirebaseUserDoc,
});
