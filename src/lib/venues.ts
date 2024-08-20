import supabase from "@/config/supabase";

export const revalidate = 3600;

export const getVenues = async () => {
  const { data = [], error } = await supabase
    .from("distinct_venues")
    .select("venue")
    .order("venue", { ascending: true });
  if (error) throw error;
  if (!data) throw new Error("No data");

  return data.map(({ venue }) => venue!);
};
