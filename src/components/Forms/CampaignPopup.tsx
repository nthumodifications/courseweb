'use client'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import supabase, { CampaignDefinition } from "@/config/supabase"
import { set } from "date-fns"
import { useEffect, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

const CampaignPopup = () => {
    const [completedCampaigns, setCompletedCampaigns] = useLocalStorage<number[]>('completedCampaigns', [])
    const [activeCampaign, setActiveCampaign] = useState<CampaignDefinition>();
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        (async () => {
            //get active campaigns that are not completed ones
            const { data, error } = await supabase.from('campaigns').select('*').eq('active', true).not('id', 'in', `(${completedCampaigns})`)
            if (error) console.error(error)

            //if there are active campaigns, show the first one
            setActiveCampaign(data?.[0])
        })()
    }, [])

    const handleCampaignCompletion = async (campaignId: number, response: string) => {
        //add campaign to completed ones
        setLoading(true)
        setActiveCampaign(undefined)
        if(completedCampaigns.includes(campaignId)) {
            console.error('Campaign already completed')
            return
        }
        setCompletedCampaigns([...completedCampaigns, campaignId])

        //get user's ip
        const ip = await fetch('https://api.ipify.org?format=json').then(res => res.json()).then(res => res.ip)

        const { error } = await supabase.from('campaign_responses').insert({ campaign_id: campaignId, response, ip })
        if (error) console.error(error)
        setLoading(false)
    }

    if(!activeCampaign) return <></>
    return (
        <AlertDialog open>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{activeCampaign.title}</AlertDialogTitle>
                <AlertDialogDescription>
                    {activeCampaign.description}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {activeCampaign.actions.map(ac => <AlertDialogAction key={ac} onClick={() => handleCampaignCompletion(activeCampaign.id, ac)}>{ac}</AlertDialogAction>)}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    )
}

export default CampaignPopup;