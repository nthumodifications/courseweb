import { AISLoading } from '@/components/Pages/AISLoading';
import dynamic from 'next/dynamic';
const AnnouncementDetailsDynamic = dynamic(() => import('./AnnouncementDetails'), { loading: () => <AISLoading />, ssr: false });

export default AnnouncementDetailsDynamic;