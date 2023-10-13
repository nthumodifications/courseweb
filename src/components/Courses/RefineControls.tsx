import MultiSelectControl from '@/components/FormComponents/MultiSelectControl';
import supabase from '@/config/supabase';
import { departments } from '@/const/departments';
import { Autocomplete, AutocompleteOption, Button, Chip, FormControl, FormLabel, List, ListItem, ListItemContent, ListItemDecorator, Sheet, Typography } from '@mui/joy';
import { useEffect, useState, FC } from 'react';
import { Controller, Control } from 'react-hook-form';

export type RefineControlFormTypes = {
    textSearch: string,
    level: string[],
    language: string[],
    others: string[],
    department: { code: string; name_zh: string; name_en: string; }[],
    firstSpecialization: string | null,
    secondSpecialization: string | null,
}

const RefineControls: FC<{ control: Control<RefineControlFormTypes> }> = ({ control }) => {
    const [firstSpecial, setFirstSpecial] = useState<string[]>([]);
    const [secondSpecial, setSecondSpecial] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const { data = [], error } = await supabase.from('distinct_first_specialization').select('unique_first_specialization');
                if (error) throw error;
                else {
                    setFirstSpecial(data?.map(({ unique_first_specialization }) => unique_first_specialization!) ?? []);
                }
            }
            catch (e) {
                console.error(e);
            }
        })();
        (async () => {
            try {
                const { data = [], error } = await supabase.from('distinct_second_specialization').select('unique_second_specialization');
                if (error) throw error;
                else {
                    setSecondSpecial(data?.map(({ unique_second_specialization }) => unique_second_specialization!) ?? []);
                }
            }
            catch (e) {
                console.error(e);
            }
        })();
    }, []);



    return <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'sm', width: 300, height: '100%', overflow: 'auto' }}>
        <Typography
            id="filter-status"
            sx={{
                textTransform: 'uppercase',
                fontSize: 'xs',
                letterSpacing: 'lg',
                fontWeight: 'lg',
                color: 'text.secondary',
            }}
        >
            Refine
        </Typography>
        <div role="group" aria-labelledby="filter-status">
            <List>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="level"
                        options={[
                            { value: 1, label: '1xxx' },
                            { value: 2, label: '2xxx' },
                            { value: 3, label: '3xxx' },
                            { value: 4, label: '4xxx' },
                            { value: 5, label: '5xxx' },
                            { value: 6, label: '6xxx' },
                            { value: 7, label: '7xxx' },
                            { value: 8, label: '8xxx' },
                            { value: 9, label: '9xxx' },
                        ]}
                        label="Level"
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="language"
                        options={[
                            { value: '英', label: 'English' },
                            { value: '中', label: '國語' },
                        ]}
                        label="Instruction Language"
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>Departments</FormLabel>
                        <Controller
                            control={control}
                            name="department"
                            render={({ field: { value, onChange } }) => (
                                <Autocomplete
                                    placeholder="Departments"
                                    value={value}
                                    onChange={(e, v) => onChange(v)}
                                    multiple={true}
                                    getOptionLabel={(option) => `${option.code} ${option.name_zh} ${option.name_en}`}
                                    isOptionEqualToValue={(option, value) => option.code === value.code}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) =>
                                            <Chip
                                                variant="soft"
                                                {...getTagProps({ index })}
                                            >
                                                {`${option.code}`}
                                            </Chip>
                                        )
                                    }
                                    renderOption={(props, option) => (
                                        <AutocompleteOption {...props}>
                                            <ListItemDecorator>
                                                <span className="text-sm font-semibold">{option.code}</span>
                                            </ListItemDecorator>
                                            <ListItemContent sx={{ fontSize: 'sm' }}>
                                                <Typography level="body-xs">
                                                    {option.name_zh} {option.name_en}
                                                </Typography>
                                            </ListItemContent>
                                        </AutocompleteOption>
                                    )}
                                    options={departments}
                                    sx={{ width: 250 }}
                                />
                            )} />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>Specialization</FormLabel>
                        <Controller
                            control={control}
                            name="firstSpecialization"
                            render={({ field: { value, onChange } }) => (
                                <Autocomplete
                                    placeholder="First Specialization"
                                    value={value}
                                    onChange={(e, v) => onChange(v)}
                                    options={firstSpecial}
                                    sx={{ width: 250 }}
                                />
                            )} />
                        <Controller
                            control={control}
                            name="secondSpecialization"
                            render={({ field: { value, onChange } }) => (
                                <Autocomplete
                                    placeholder="Second Specialization"
                                    value={value}
                                    onChange={(e, v) => onChange(v)}
                                    options={secondSpecial}
                                    sx={{ width: 250 }}
                                />
                            )} />

                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="others"
                        options={[
                            { value: 'xclass', label: 'X-Class' },
                        ]}
                        label="Others"
                    />
                </ListItem>
            </List>
        </div>
        <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => { }
            }
            sx={{ px: 1.5, mt: 1 }}
        >
            Clear All
        </Button>
    </Sheet>
}

export default RefineControls;