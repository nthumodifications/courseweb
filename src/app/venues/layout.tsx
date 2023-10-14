'use server';
import { Button, Input } from "@mui/joy";
import {FC, PropsWithChildren, useEffect, useState} from 'react';
import supabase from '@/config/supabase';
import Link from "next/link";
import VenueList from "@/components/Venue/VenueList";

export const generateMetadata = () => ({
    title: '地點 Venues | NTHUMods'
})

const LocationLayout: FC<PropsWithChildren> = async ({ children }) => {
    return <div className="h-full grid grid-cols-[480px_auto] grid-rows-1">
        <VenueList/>
        <main className='overflow-auto'>
            {children}
        </main>
    </div>
}

export default LocationLayout;