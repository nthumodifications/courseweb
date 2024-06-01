import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { PropsWithChildren } from 'react';
import { hasTimes } from '@/helpers/courses';
import { MinimalCourse } from '@/types/courses';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Compact from '@uiw/react-color-compact';
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from '../ui/button';
import Link from 'next/link';
import { Book, ExternalLink } from 'lucide-react';

export const TimetableItemDrawer = ({ course, children }: PropsWithChildren<{ course: MinimalCourse; }>) => {
    const {
        deleteCourse, colorMap, setColor, currentColors
    } = useUserTimetable();
    return <Drawer>
        <DrawerTrigger asChild>
            {children}
        </DrawerTrigger>
        <DrawerContent>
            <DrawerHeader>
                <div className='flex flex-row text-left gap-4'>
                    <Popover>
                        <PopoverTrigger>
                            <div className='p-1 rounded-md hover:outline outline-1 outline-slate-400'>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorMap[course.raw_id] }}></div>

                            </div>
                        </PopoverTrigger>
                        <PopoverContent className='p-0'>
                            <Compact
                                color={colorMap[course.raw_id]}
                                onChange={(color) => {
                                    setColor(course.raw_id, color.hex);
                                }}
                                colors={currentColors} />
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-col flex-1">
                        <span className="text-sm">{course.department} {course.course}-{course.class}</span>
                        <span className="text-sm">{course.name_zh} - {course.teacher_zh.join(',')}</span>
                        <span className="text-xs">{course.name_en}</span>
                        <div className="mt-1">
                            {course.venues?.map((venue, index) => {
                                const time = course.times![index];
                                return <div key={index} className="flex flex-row items-center space-x-2 font-mono text-gray-400">
                                    <span className="text-xs">{venue}</span>
                                    {hasTimes(course as MinimalCourse) ? <span className="text-xs">{time}</span> : <span className="text-xs text-red-500">缺時間</span>}
                                </div>;
                            }) || <span className="text-gray-400 text-xs">No Venue</span>}
                        </div>
                    </div>
                </div>
            </DrawerHeader>
            <div className='p-4 flex flex-col gap-4'>
                <div className='grid grid-cols-2 gap-2'>
                    <Button variant='outline' asChild>
                        <Link href={`/courses/${course.raw_id}`}>
                            <ExternalLink className='w-4 h-4 mr-2' />
                            課程詳情
                        </Link>
                    </Button>
                    <Button variant='outline' disabled={true}>
                        <Book className='w-4 h-4 mr-2' />
                        學習平臺
                    </Button>
                </div>
            </div>
            {/* <DrawerFooter>
            <DrawerClose>
                <Button variant="outline">Cancel</Button>
            </DrawerClose>
        </DrawerFooter> */}
        </DrawerContent>

    </Drawer>;
};
