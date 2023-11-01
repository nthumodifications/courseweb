'use client';
import {Button, Input} from '@mui/joy';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Fuse from 'fuse.js'
import { useSettings } from '@/hooks/contexts/settings';
import useSupabaseClient from '@/config/supabase_client';

const VenueList = () => {
    const [venues, setVenues] = useState<string[]>([]);
    const [filtered, setFiltered] = useState<Fuse.FuseResult<string>[]>([]);
    const [textSearch, setTextSearch] = useState<string>('');
    const fuse = useRef(new Fuse(venues));
    const supabase = useSupabaseClient();
    const { language } = useSettings();
    useEffect(() => {
        (async () => {
            const { data = [], error } = await supabase.from('distinct_venues').select('venue').order('venue', { ascending: true });
            if (error) throw error;
            else {
                setVenues(data?.map(({ venue }) => venue!) ?? []);
                fuse.current = new Fuse(data?.map(({ venue }) => venue!) ?? []);
            }
        })();
    }, [])

    useEffect(() => {
        setFiltered(fuse.current.search(textSearch));
    }, [textSearch])

    return <div className="h-full w-full px-8 py-4 space-y-4 overflow-auto">
            <Input placeholder="Search..." value={textSearch} onChange={(e) => setTextSearch(e.target.value)}/>
            <div className="grid grid-cols-2 md:grid-cols-3">
                {(textSearch == '' ? venues: filtered.map(mod => mod.item)).map((venue, i) => <Link 
                    key={i} 
                    href={`/${language}/venues/${venue}`}>
                    <Button 
                        className="text-gray-400" 
                        variant="plain" 
                    >{venue}</Button>
                </Link>)}
            </div>
        </div>
}

export default VenueList;