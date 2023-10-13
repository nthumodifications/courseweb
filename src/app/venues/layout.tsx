'use client';
import { Button, Input } from "@mui/joy";
import {FC, PropsWithChildren, useEffect, useState} from 'react';
import supabase from '@/config/supabase';

const LocationLayout: FC<PropsWithChildren> = ({ children }) => {
    const [venues, setVenues] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const { data = [], error } = await supabase.from('distinct_venues').select('venue').order('venue', { ascending: true });
                if (error) throw error;
                else {
                    setVenues(data?.map(({ venue }) => venue!) ?? []);
                }
            }
            catch (e) {
                console.error(e);
            }
        })();
    }, []);
    return <div className="h-full grid grid-cols-[480px_auto] grid-rows-1">
        <div className="h-full w-full px-8 py-4 space-y-4">
            <Input placeholder="Search..." />
            <div className="grid grid-cols-3">
                {venues.map((venue, i) => <Button key={i} className="text-gray-400" variant="plain" >{venue}</Button>)}
            </div>
        </div>
        <main className='overflow-auto'>
            {children}
        </main>
    </div>
}

export default LocationLayout;