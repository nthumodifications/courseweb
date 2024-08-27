import supabase_server from "@/config/supabase_server";
import { LangProps } from "@/types/pages";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export const runtime = "nodejs";

const getCdsTerms = async () => {
  const { data, error } = await supabase_server
    .from("cds_terms")
    .select("*")
    .order("term", { ascending: false });

  if (error) throw error;
  return data!;
};
const CDSTermsPage = async ({ params: { lang } }: LangProps) => {
  const termObjs = await getCdsTerms();
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead>調查學期</TableHead>
          <TableHead>開始時間</TableHead>
          <TableHead>結束時間</TableHead>
          <TableHead>參考學期</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {termObjs.map((termObj) => (
          <TableRow key={termObj.term}>
            <TableCell>{termObj.term}</TableCell>
            <TableCell>{termObj.starts}</TableCell>
            <TableCell>{termObj.ends}</TableCell>
            <TableCell>
              {termObj.ref_sem},{termObj.ref_sem_2}
            </TableCell>
            <TableCell>
              <Link href={`/${lang}/cds/admin/${termObj.term}`}>
                <Button variant="ghost">
                  細節
                  <ExternalLink size={16} className="ml-2" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CDSTermsPage;
