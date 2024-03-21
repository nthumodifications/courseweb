'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useSettings } from '@/hooks/contexts/settings';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type Fuse from 'fuse.js';

const VenueList = ({ venues }: { venues: string[]}) => {
    const [filtered, setFiltered] = useState<Fuse.FuseResult<string>[]>([]);
    const [textSearch, setTextSearch] = useState<string>('');
    const { language } = useSettings();

    useEffect(() => {
        (async () => {
            const Fuse = (await import('fuse.js')).default;
            const fuse = new Fuse(venues);
            setFiltered(fuse.search(textSearch));
        })()
    }, [venues, textSearch])

    return <div className="px-8 py-4 space-y-4">
            <Input className='sticky top-0' placeholder="Search..." value={textSearch} onChange={(e) => setTextSearch(e.target.value)}/>
            <div className="grid grid-cols-2 md:grid-cols-3">
                {(textSearch == '' ? venues: filtered.map(mod => mod.item)).map((venue, i) => <Link 
                    key={i} 
                    href={`/${language}/venues/${venue}`}>
                    <Button 
                        className="text-gray-400" 
                        variant="ghost" 
                    >{venue}</Button>
                </Link>)}
            </div>
        </div>
}

export default VenueList;