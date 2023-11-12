import { CourseDefinition } from "@/config/supabase";
import { scheduleTimeSlots } from "@/const/timetable";
import { CourseTimeslotData } from "@/types/timetable";
import { MinimalCourse } from '@/types/courses';
import { getBrightness } from "./colors";
import {adjustBrightness} from '@/helpers/colors';

export const timetableColors: { [theme: string]: string[] } = {
    'harmonyBlossom': [
        "#855EBE", // Orchid Whisper
        "#D65DB1", // Pink Dahlia
        "#FF6F91", // Blossom Pink
        "#FF9573", // Coral Charm
        "#FFC85B", // Sunlit Petal
        "#A9BC5D", // Meadow Glow
        "#5DA671", // Fresh Fern
        "#22907B", // Turquoise Dream
        "#1C6873", // Deep Lagoon
        "#2F4959", // Midnight Sapphire
    ],
    'autumnSunset': [
        "#844C2A", // Maple Brown
        "#D65631", // Fiery Pumpkin
        "#FF7F3D", // Sunset Blaze
        "#FFA354", // Harvest Gold
        "#FFCE6C", // Amber Glow
        "#A8B964", // Olive Grove
        "#5C9053", // Forest Green
        "#207A69", // Teal Twilight
        "#1C6472", // Twilight Blue
        "#2F4A59", // Dusk Navy
    ],
    'oceanBreeze': [
        "#2A758C", // Deep Sea Blue
        "#316ED6", // Azure Waters
        "#3D88FF", // Oceanic Blue
        "#54A0FF", // Calm Surf
        "#6CBEFF", // Gentle Breeze
        "#64B9A8", // Coastal Green
        "#53A061", // Seafoam Delight
        "#427F27", // Emerald Shore
        "#355A22", // Seaside Moss
        "#2A472F", // Midnight Tide
    ],
    'springMeadow': [
        "#688456", // Fresh Grass
        "#6ED663", // Zesty Lime
        "#80FF70", // Spring Green
        "#A2FF8E", // Vibrant Meadow
        "#C9FFAB", // Lush Pasture
        "#B3C35E", // Sunny Field
        "#94A72F", // Meadowland
        "#7B8E1E", // Golden Sun
        "#68721A", // Honeydew Gold
        "#4A5A2F", // Mossy Path
    ],
    'sunsetWarmth': [
        "#8C5F2A", // Amber Haze
        "#D68431", // Tangerine Sunset
        "#FF9B3D", // Warm Embrace
        "#FFB854", // Sunlit Copper
        "#FFD06C", // Golden Radiance
        "#BCAB60", // Amber Fields
        "#7E762F", // Sunflower Gold
        "#55782D", // Olive Harvest
        "#48671A", // Burnished Bronze
        "#3C4D2F", // Rustic Ember
    ],
    'roseGarden': [
        "#8C5E61", // Dusty Rose
        "#D65D75", // Rose Petal
        "#FF6F8F", // Blush Pink
        "#FF969D", // Rosy Cheeks
        "#FFC76C", // Sun-kissed Rose
        "#B99D61", // Antique Rose
        "#7E625E", // Mauve Dream
        "#8E4C75", // Orchid Mist
        "#7A3673", // Violet Haze
        "#5D2D59", // Midnight Rose
    ],
    'sapphireTwilight': [
        "#59618C", // Twilight Blue
        "#734DD6", // Sapphire Gem
        "#9181FF", // Evening Sky
        "#A89EFF", // Starry Horizon
        "#C6C5FF", // Lavender Dusk
        "#B5B4A8", // Misty Lake
        "#7F8F61", // Enchanted Forest
        "#4E7627", // Emerald Moon
        "#2F712A", // Pine Grove
        "#292F47", // Midnight Sapphire
    ],
    'goldenHarbor': [
        "#8C752A", // Sunlit Sand
        "#D68F31", // Golden Shores
        "#FFA63D", // Amber Harbor
        "#FFBC54", // Glistening Gold
        "#FFD36C", // Radiant Bay
        "#B8A461", // Coastal Pebble
        "#8E842F", // Lighthouse Glow
        "#6D7427", // Warm Marina
        "#6F591A", // Sunlit Deck
        "#4F432F", // Nautical Bronze
    ],
    'plumElegance': [
        "#8C5E81", // Plum Charm
        "#D65D96", // Lavender Mist
        "#FF6FAA", // Radiant Orchid
        "#FF96B9", // Velvet Blossom
        "#FFC76C", // Golden Plum
        "#B88761", // Peach Blossom
        "#8E5C6E", // Mauve Serenity
        "#753B8E", // Twilight Rose
        "#6B1A87", // Royal Amethyst
        "#4F2D4A", // Midnight Plum
    ],
    'pastelColors': [
        '#E8CACA',
        '#FFE5A8',
        '#F8FF97',
        '#BCFFA4',
        '#A6FFD3',
        '#B9E3FF',
        '#C1CCFF',
        '#E4CFFF',
        '#F1CEF4',
        '#F8D9E8'
    ],
    'tsinghuarian': [
        '#845EC2',
        '#D65DB1',
        '#FF6F91',
        '#FF9671',
        '#FFC75F',
        '#A8BB5C',
        '#5CA46E',
        '#20887A',
        '#1C6873',
        '#2F4858'
    ]
}


export const createTimetableFromCourses = (data: MinimalCourse[], theme = 'tsinghuarian') => {
    const newTimetableData: CourseTimeslotData[] = [];
    data!.forEach(course => {
        //get unique days first
        if (!course.times) {
            return;
        };
        course.times.forEach((time_str, index) => {
            const timeslots = time_str.match(/.{1,2}/g)?.map(day => ({ day: day[0], time: day[1] }));
            const days = timeslots!.map(time => time.day).filter((day, index, self) => self.indexOf(day) === index);
            days.forEach(day => {
                const times = timeslots!.filter(time => time.day == day).map(time => scheduleTimeSlots.map(m => m.time).indexOf(time.time));
                //get the start and end time
                const startTime = Math.min(...times);
                const endTime = Math.max(...times);
                //get the color, mod the index by the length of the color array so that it loops
                const color = timetableColors[theme][data!.indexOf(course) % timetableColors[theme].length];

                //Determine the text color
                const brightness = getBrightness(color);
                //From the brightness, using the adjustBrightness function, create a complementary color that is legible
                const textColor = adjustBrightness(color, brightness > 100 ? -50 : 90);
                


                //push to scheduleData
                newTimetableData.push({
                    course: course,
                    venue: course.venues![index]!,
                    dayOfWeek: 'MTWRFS'.indexOf(day),
                    startTime: startTime,
                    endTime: endTime,
                    color: color,
                    textColor: textColor,
                });
            });
        });

    });
    return newTimetableData;
}
