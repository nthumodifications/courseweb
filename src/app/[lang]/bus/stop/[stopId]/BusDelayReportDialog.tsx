import {Button, ModalDialog, DialogTitle, DialogContent, ListItem, ListItemDecorator, FormControl, FormLabel, RadioGroup, Radio, FormHelperText, CircularProgress} from '@mui/joy';
import {format} from 'date-fns';
import {Controller, useForm} from 'react-hook-form';
import InputControl from '@/components/FormComponents/InputControl';
import AutocompleteControl from '@/components/FormComponents/AutocompleteControl';
import RedLineIcon from '@/components/BusIcons/RedLineIcon';
import GreenLineIcon from '@/components/BusIcons/GreenLineIcon';
import NandaLineIcon from '@/components/BusIcons/NandaLineIcon';
import useSupabaseClient from '@/config/supabase_client';

type SchoolBusType = { 
    label_zh: string, 
    label_en: string, 
    value: string 
}

type BusDelayReport = {
    route: SchoolBusType | null;
    time: string;
    problem: string;
    other_problem?: string;
}

const BusDelayReportDialog = ({ onClose }: { onClose: () => void }) => {
    const { control, setValue, watch, handleSubmit, formState: { isSubmitting, isValid } } = useForm<BusDelayReport>( {
        defaultValues: {
            route: null,
            time: '',
            problem: '',
        },
        mode: 'onChange'
    });
    const supabase = useSupabaseClient();

    const handleTimeNow = () => {
        setValue('time', format(new Date(), 'HH:mm'));
    }

    const onSubmit = async (data: BusDelayReport) => {
        await supabase.from('delay_reports').insert({
            route: data.route!.value,
            time: `${data.time}+08`,
            problem: data.problem,
            other_problem: data.other_problem ?? null,
        });
        onClose();
    }

    const isOtherProblem = watch('problem') == 'others';

    return <ModalDialog>
        <DialogTitle>誤點通報</DialogTitle>
        <DialogContent>
            <div className='space-y-4 py-3 flex flex-col overflow-hidden'>
                <FormControl>
                <FormLabel>原定發車時間</FormLabel>
                    <InputControl
                        control={control}
                        name='time'
                        type='time'
                        placeholder='時間'
                        rules={{ required: true }}
                        endDecorator={<Button variant='plain' color='neutral' onClick={handleTimeNow}>現在</Button>}
                        defaultValue={format(new Date(), 'HH:mm')}
                    />
                </FormControl>
                <FormControl>
                <FormLabel>線路</FormLabel>
                    <AutocompleteControl
                        control={control}
                        name="route"
                        placeholder='選擇線路'
                        rules={{ required: true }}
                        renderOption={(props, option) => (
                            <ListItem {...props}>
                                <ListItemDecorator>{option.icon}</ListItemDecorator>
                                <span className='flex-1'>{option.label_zh} {option.label_en}</span>
                            </ListItem>
                        )}
                        getOptionLabel={(option) => typeof option == 'string' ? option: (`${option.label_zh} ${option.label_en}`)}
                        isOptionEqualToValue={(option, value) => option.value == value.value}
                        options={[
                            { label_zh: '紅線', label_en: 'Red Line', value: 'R', icon: <RedLineIcon/> },
                            { label_zh: '綠線', label_en: 'Green Line', value: 'G', icon: <GreenLineIcon/> },
                            { label_zh: '南大線', label_en: 'Nanda Line', value: 'N', icon: <NandaLineIcon/> }
                        ]}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>問題</FormLabel>
                    <Controller
                        control={control}
                        name='problem'
                        rules={{ required: true }}
                        render={({ field: {value, onChange} }) => (
                            <RadioGroup name="problem-group" value={value} onChange={onChange}>
                                <Radio value='missing' label="沒有來" variant="outlined" />
                                <Radio value='early' label="早發車" variant="outlined" />
                                <Radio value='others' label="其他" variant="outlined" />
                            </RadioGroup>
                        )}
                    />
                </FormControl>
                {isOtherProblem && 
                <InputControl
                    control={control}
                    name='other_problem'
                    placeholder='其他問題'
                />}
                <FormHelperText>
                    謝謝你的通報！
                </FormHelperText>
                <Button variant='solid' color='warning' onClick={handleSubmit(onSubmit)} disabled={!isValid || isSubmitting}>
                    {isSubmitting? <CircularProgress/>: "提交"}
                </Button>
            </div>
        </DialogContent>
    </ModalDialog>
}

export default BusDelayReportDialog;