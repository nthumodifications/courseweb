import supabase_server from "@/config/supabase_server";
import { addDays, formatISO, set } from "date-fns";

export const getAlerts = async () => {
  //get starting from today morning 00:00 to 6 days later 23:59
  const { data, error } = await supabase_server
    .from("alerts")
    .select("*")
    .gte(
      "start_date",
      formatISO(
        set(new Date(), {
          hours: 0,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        }),
      ),
    )
    .lte(
      "end_date",
      formatISO(
        set(addDays(new Date(), 6), {
          hours: 23,
          minutes: 59,
          seconds: 59,
          milliseconds: 999,
        }),
      ),
    );
  //TODO: check if it works?
  if (error) {
    console.error(error);
    throw new Error("Failed to fetch data");
  } else return data!;
};
