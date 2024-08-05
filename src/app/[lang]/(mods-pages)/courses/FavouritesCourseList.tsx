import { GripVertical, Plus, Heart, Minus } from 'lucide-react';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useRouter, useSearchParams } from 'next/navigation';
import useDictionary from '@/dictionaries/useDictionary';
import { useMemo } from 'react';
import { hasTimes } from '@/helpers/courses';
import { MinimalCourse } from '@/types/courses';
import { Button } from '@/components/ui/button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useQuery } from '@tanstack/react-query';
import supabase from '@/config/supabase';
import { CourseDefinition } from '@/config/supabase';
import { useLocalStorage } from 'usehooks-ts';

const TimetableCourseListItem = ({
    course,
}: {
    course: MinimalCourse,
}) => {
    const { language } = useSettings();
    const router = useRouter();
    const searchParams = useSearchParams();

    const {
        addCourse,
        deleteCourse,
        isCourseSelected
    } = useUserTimetable();

    const [favourites, setFavourites] = useLocalStorage<string[]>('course_favourites', []);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: course.raw_id });


    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const unfavourite = () => {
        setFavourites(favourites.filter(fav => fav != course.raw_id));
    }

    return <div className="flex flex-row gap-2 items-center max-w-3xl" ref={setNodeRef} style={style} >
        <GripVertical className="w-4 h-4 text-gray-400" {...attributes} {...listeners} />
        <div className="flex flex-col flex-1" onClick={() => router.push(`/${language}/courses/${course.raw_id}?${searchParams.toString()}`,)}>
            <span className="text-sm">{course.department} {course.course}-{course.class} {course.name_zh} - {course.teacher_zh.join(',')}</span>
            <span className="text-xs">{course.name_en}</span>
            <div className="mt-1">
                {course.venues?.map((venue, index) => {
                    const time = course.times![index];
                    return <div key={index} className="flex flex-row items-center space-x-2 text-gray-400">
                        <span className="text-xs">{venue}</span>
                        {hasTimes(course as MinimalCourse) ? <span className="text-xs">{time}</span> : <span className="text-xs text-red-500">缺時間</span>}
                    </div>
                }) || <span className="text-gray-400 text-xs">No Venue</span>}
            </div>
        </div>
        <div className="flex flex-col gap-1 items-start">
            <div className="flex flex-row items-center space-x-1">
                <span className="text-base">{course.credits}</span>
                <span className="text-xs text-gray-400">學分</span>
            </div>
            <div className='flex flex-row'>
                <Button className='rounded-r-none' variant="outline" size="icon" onClick={() => unfavourite()}>
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </Button>
                {isCourseSelected(course.raw_id) ?
                    <Button className='rounded-l-none' variant="destructive" size="icon" onClick={() => deleteCourse(course.raw_id)}>
                        <Minus className="w-4 h-4" />
                    </Button> :
                    <Button className='rounded-l-none' variant="outline" size="icon" onClick={() => addCourse(course.raw_id)}>
                        <Plus className="w-4 h-4" />
                    </Button>}
            </div>
        </div>
    </div>
}

export const FavouritesCourseList = ({
}: {
    }) => {
    const { language } = useSettings();
    const dict = useDictionary();
    const router = useRouter();
    const [favourites, setFavourites] = useLocalStorage<string[]>('course_favourites', []);

    const { data: courses = [], error } = useQuery({
        queryKey: ['courses', [...favourites].sort()],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('courses').select('*').in('raw_id', [...favourites].sort());
            if (error) throw error;
            if (!data) throw new Error('No data');
            return data as CourseDefinition[];
        },
    });

    const displayCourseData = useMemo(() => courses.sort((a, b) => favourites.indexOf(a.raw_id) - favourites.indexOf(b.raw_id)), [courses, favourites]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        if (active.id !== over.id) {
            setFavourites((favourites) => {
                const oldIndex = favourites.indexOf(active.id as string);
                const newIndex = favourites.indexOf(over.id as string);

                return arrayMove(favourites, oldIndex, newIndex);
            });
            // const courseCopy = [...favourites];
            // const oldIndex = courseCopy.indexOf(active.id as string);
            // const newIndex = courseCopy.indexOf(over.id as string);
            // const newCourseCopy = arrayMove(courseCopy, oldIndex, newIndex);
            // setFavourites(newCourseCopy);
        }
    }

    return <div className='flex flex-col gap-2'>
        <div className={`flex flex-col gap-4 px-4 flex-wrap`}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <SortableContext
                    items={displayCourseData.map(course => course.raw_id)}
                    strategy={verticalListSortingStrategy}
                >
                    {displayCourseData.map((course, index) => (
                        <TimetableCourseListItem
                            key={index}
                            course={course as MinimalCourse}
                        />
                    ))}
                </SortableContext>
            </DndContext>
            {displayCourseData.length == 0 && (
                <div className="flex flex-col items-center space-y-4">
                    <span className="text-lg font-semibold text-gray-400">{"No Favourites Added (yet)"}</span>
                </div>
            )}
        </div>
    </div>
}
export default FavouritesCourseList;