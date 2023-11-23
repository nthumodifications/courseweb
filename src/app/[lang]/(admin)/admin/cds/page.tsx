import supabase_server from "@/config/supabase_server"
import { LangProps } from "@/types/pages";
import { Button, Table } from "@mui/joy"
import Link from "next/link";
import { ExternalLink, Link as LinkIcon } from "react-feather";

export const runtime = "nodejs";

const getCdsTerms = async () => {
    const { data, error } = await supabase_server
        .from('cds_terms')
        .select('*')
        .order('term', { ascending: false })

    if (error) throw error
    return data!
}
const CDSTermsPage = async ({
    params: { lang }
}: LangProps) => {
    const termObjs = await getCdsTerms()
    return (
        <Table className="w-full">
            <thead>
                <tr>
                    <th>調查學期</th>
                    <th>開始時間</th>
                    <th>結束時間</th>
                    <th>參考學期</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {termObjs.map((termObj) => (
                    <tr key={termObj.term}>
                        <td>{termObj.term}</td>
                        <td>{termObj.starts}</td>
                        <td>{termObj.ends}</td>
                        <td>{termObj.ref_sem}</td>
                        <td>
                            <Link href={`/${lang}/admin/cds/${termObj.term}`}>
                                <Button variant="soft" endDecorator={<ExternalLink size={16}/>}>細節</Button>
                            </Link>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export default CDSTermsPage