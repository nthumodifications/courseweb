import supabase from "@/config/supabase";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { MinimalCourse } from "@/types/courses";
import { scheduleTimeSlots } from '@/const/timetable';
import { CourseTimeslotData, TimetableDim, TimeSlot } from '@/types/timetable';
import { FC } from 'react';

type CourseTimeslotDataWithFraction = CourseTimeslotData & { fraction: number, fractionIndex: number, timeSlots: string[] };


type TimetableSlotProps = {
    course: CourseTimeslotData,
    tableDim: TimetableDim,
    fraction?: number,
    fractionIndex?: number
}

const size = 2.5;

async function getFonts() {
    // This is unfortunate but I can't figure out how to load local font files
    // when deployed to vercel.
    const [interRegular, interMedium, interSemiBold, interBold] =
        await Promise.all([
            fetch(`https://rsms.me/inter/font-files/Inter-Regular.woff`).then((res) =>
                res.arrayBuffer()
            ),
            fetch(`https://rsms.me/inter/font-files/Inter-Medium.woff`).then((res) =>
                res.arrayBuffer()
            ),
            fetch(`https://rsms.me/inter/font-files/Inter-SemiBold.woff`).then(
                (res) => res.arrayBuffer()
            ),
            fetch(`https://rsms.me/inter/font-files/Inter-Bold.woff`).then((res) =>
                res.arrayBuffer()
            ),
        ]);

    return [
        {
            name: "Inter",
            data: interRegular,
            style: "normal",
            weight: 400,
        },
        {
            name: "Inter",
            data: interMedium,
            style: "normal",
            weight: 500,
        },
        {
            name: "Inter",
            data: interSemiBold,
            style: "normal",
            weight: 600,
        },
        {
            name: "Inter",
            data: interBold,
            style: "normal",
            weight: 700,
        },
    ];
}


export const runtime = 'edge';

const TimeslotHeader = (
    ({ start, end, time, tableDim, showSaturday = false }: TimeSlot & { tableDim: TimetableDim, firstRow: boolean, showSaturday?: boolean }) => {
        return (
            <tr style={{
                height: tableDim.timetable.height
            }}>
                <td style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: tableDim.timetable.width,
                    height: tableDim.timetable.height,
                }}>
                    <span
                        style={{
                            fontSize: 12 * size,
                            color: 'rgba(156, 163, 175, 1)'
                        }}>{start}</span>
                    <span
                        style={{
                            fontSize: 14 * size,
                            fontWeight: 600,
                        }}>第{time}節</span>
                    <span style={{
                        fontSize: 12 * size,
                        color: 'rgba(156, 163, 175, 1)'
                    }}>{end}</span>
                </td>
                <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>
                <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>
                <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>
                <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>
                <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>
                {showSaturday && <td style={{
                    height: tableDim.timetable.height,
                    width: tableDim.header.width,
                    border: '1px solid rgba(209, 213, 219, 1)'
                }}></td>}
            </tr>
        )
    })

const TimetableSlot: FC<TimetableSlotProps> = ({ course, tableDim, fraction = 1, fractionIndex = 1 }) => {

    return (
        <div
            className={`absolute rounded-md shadow-lg transform translate-y-0.5 cursor-pointer`}
            style={{

                //converted from tailwind
                position: 'absolute',
                borderRadius: 6 * size,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transform: 'translateY(10px)',
                left: tableDim.timetable.width + course.dayOfWeek * tableDim.header.width + (fractionIndex - 1) * (tableDim.header.width / fraction),
                top: tableDim.header.height + (course.startTime) * tableDim.timetable.height - 8,
                width: (tableDim.header.width / fraction),
                height: (course.endTime - course.startTime + 1) * tableDim.timetable.height,
                backgroundColor: course.color,
                display: 'flex'
            }}
        >
            <div
                className='flex flex-col justify-start items-start text-left h-full text-black/70 p-1 select-none'
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    height: '100%',
                    color: 'rgba(0, 0, 0, 0.7)',
                    padding: 4 * size
                }} >
                <span
                    className='text-xs line-clamp-2 font-bold'
                    style={{
                        fontSize: 12 * size,
                        fontWeight: 700,
                        lineClamp: 2,
                        color: course.textColor
                    }}
                >{course.course.name_zh}</span>
                <span
                    className='text-[10px]'
                    style={{
                        fontSize: 10 * size,
                        color: course.textColor
                    }}
                >{course.venue}</span>
                {course.course.teacher_zh && <span className='text-[10px]'
                    style={{
                        fontSize: 10 * size,
                        color: course.textColor
                    }}
                >{course.course.teacher_zh?.join(',')}</span>}
            </div>
        </div>
    );
}


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester');
    const courses_ids = searchParams.get('semester_'+semester)?.split(',')!;
    const theme = searchParams.get('theme') || 'tsinghuarian';


    try {
        let { data = [], error } = await supabase.from('courses').select("*").in('raw_id', courses_ids);
        if (error) throw error;
        else {
            const timetableData = createTimetableFromCourses(data! as MinimalCourse[], theme);

            const showSaturday = timetableData.some(course => course.dayOfWeek == 5);

            const tableDim = {
                header: {
                    width: 80 * size,
                    height: 36 * size
                },
                timetable: {
                    width: 40 * size,
                    height: 68 * size
                }
            }

            const timetableDataWithFraction = () => {
                const slotSums = timetableData.reduce((acc, cur) => {
                    // get the array of [${dayofWeek}${starttime}, ${dayofWeek}${starttime+1}, ...${dayofWeek}${endtime}]
                    const timeSlots = Array.from({ length: cur.endTime - cur.startTime + 1 }, (_, i) => `${'MTWRFS'[cur.dayOfWeek]}${cur.startTime + i}`);
                    // add the array to the accumulator
                    acc.push(...timeSlots);
                    return acc;
                }, [] as string[]);

                // calculate slots that are overlapped
                const slotCounts = slotSums.reduce((acc, cur) => {
                    acc[cur] = (acc[cur] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                // reduce through the courses, get the maximum of the sum of overlapped slots, which is their fraction.
                // if this is the first course with this fraction, set the fractionIndex to 1
                // else if there is a previous course that has at least one of timeslots overlapping, set the fractionIndex to the previous course's fractionIndex + 1
                // else set the fractionIndex to 1
                const timetableDataWithFraction = timetableData.reduce((acc, cur) => {
                    const timeSlots = Array.from({ length: cur.endTime - cur.startTime + 1 }, (_, i) => `${'MTWRFS'[cur.dayOfWeek]}${cur.startTime + i}`);
                    const fraction = Math.max(...timeSlots.map(slot => slotCounts[slot]));
                    const fractionIndex = acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot))).length > 0
                        ? acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot)))[0].fractionIndex + 1
                        : 1;
                    acc.push({ ...cur, fraction, fractionIndex, timeSlots });
                    return acc;
                }, [] as CourseTimeslotDataWithFraction[]);

                return timetableDataWithFraction
            };

            return new ImageResponse(
                <div
                    className="p-4 flex flex-col"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 16 * size,
                        background: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: '"Inter"',
                        width: '100%',
                        height: '100%'
                    }}>
                    <div
                        className="text-center lg:mb-0 w-full flex"
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        {/* Timetable, Relative overlay */}
                        <div
                            className="relative w-full"
                            style={{
                                display: 'flex',
                                position: 'relative',
                                width: '100%'
                            }}>
                            <table
                                className="table-auto w-full"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%'
                                }}
                            >
                                <thead>
                                    <tr>
                                        <td
                                            style={{
                                                width: tableDim.timetable.width,
                                            }}></td>
                                        <td
                                            style={{
                                                width: tableDim.header.width,
                                                height: tableDim.header.height,
                                                fontSize: 12 * size,
                                                fontWeight: 600,
                                                padding: 8 * size,
                                                border: '1px solid #D1D5DB',
                                                backgroundColor: '#FFF',
                                                color: '#1F2937',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>MON</td>
                                        <td style={{
                                            width: tableDim.header.width,
                                            height: tableDim.header.height,
                                            fontSize: 12 * size,
                                            fontWeight: 600,
                                            padding: 8 * size,
                                            border: '1px solid #D1D5DB',
                                            backgroundColor: '#FFF',
                                            color: '#1F2937',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>TUE</td>
                                        <td style={{
                                            width: tableDim.header.width,
                                            height: tableDim.header.height,
                                            fontSize: 12 * size,
                                            fontWeight: 600,
                                            padding: 8 * size,
                                            border: '1px solid #D1D5DB',
                                            backgroundColor: '#FFF',
                                            color: '#1F2937',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>WED</td>
                                        <td style={{
                                            width: tableDim.header.width,
                                            height: tableDim.header.height,
                                            fontSize: 12 * size,
                                            fontWeight: 600,
                                            padding: 8 * size,
                                            border: '1px solid #D1D5DB',
                                            backgroundColor: '#FFF',
                                            color: '#1F2937',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>THU</td>
                                        <td style={{
                                            width: tableDim.header.width,
                                            height: tableDim.header.height,
                                            fontSize: 12 * size,
                                            fontWeight: 600,
                                            padding: 8 * size,
                                            border: '1px solid #D1D5DB',
                                            backgroundColor: '#FFF',
                                            color: '#1F2937',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>FRI</td>
                                        {showSaturday && <td
                                            className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'
                                            style={{
                                                width: tableDim.header.width,
                                                height: tableDim.header.height,
                                                fontSize: 12 * size,
                                                fontWeight: 600,
                                                padding: 8 * size,
                                                border: '1px solid #D1D5DB',
                                                backgroundColor: '#FFF',
                                                color: '#1F2937',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >SAT</td>}
                                    </tr>
                                </thead>
                                <tbody style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    {scheduleTimeSlots.map((time, index) => (
                                        <TimeslotHeader key={index} tableDim={tableDim} time={time.time} start={time.start} end={time.end} firstRow={index == 0} showSaturday={showSaturday} />
                                    ))}
                                </tbody>
                            </table>
                            <div
                                className='absolute top-0 left-0 w-full h-full'
                                style={{
                                    display: 'flex',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%'
                                }}>
                                {timetableDataWithFraction().map((data, index) => (
                                    <TimetableSlot
                                        key={index}
                                        course={data}
                                        tableDim={tableDim}
                                        fraction={data.fraction}
                                        fractionIndex={data.fractionIndex}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>,
                {
                    //optmized for 2:1 ratio, at least 1080
                    width: 490 * size,
                    height: 980 * size,
                    //@ts-ignore
                    fonts: await getFonts(),
                }
            )
        }
    } catch (e) {
        console.error(e);
        return NextResponse.redirect('https://nthumods.com', { status: 500 });
    }
}