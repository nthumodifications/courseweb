import React, { useState } from 'react';
import {TimetableDisplayPreferences} from '@/hooks/contexts/useUserTimetable';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useDictionary from '@/dictionaries/useDictionary';

interface SettingsControlProps {
    settings: TimetableDisplayPreferences;
    onSettingsChange: (settings: TimetableDisplayPreferences) => void;
}

const TimetablePreferences: React.FC<SettingsControlProps> = ({
    settings,
    onSettingsChange,
}) => {
  const dict = useDictionary();

  const handleLanguageChange = (value: 'app' | 'zh' | 'en') => {
    onSettingsChange({
        ...settings,
        language: value,
    });
  };

  const handleAlignChange = (value: 'left' | 'center' | 'right') => {
    onSettingsChange({
        ...settings,
      align: value,
    });
  };

  const handleDisplayChange = (
    key: 'title' | 'code' | 'time' | 'venue'
  ) => {
    onSettingsChange({
        ...settings,
      display: { ...settings.display, [key]: !settings.display[key] },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row">
        <label htmlFor="language" className="block font-bold flex-1">
          {dict.settings.timetable.language}:
        </label>
        <div className='flex items-center'>
            <Select value={settings.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className='w-[180px]'>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="zh">繁體中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>

      <div className="flex flex-row">
        <label htmlFor="align" className="block font-bold flex-1">
          {dict.settings.timetable.align.title}:
        </label>
        <div className='flex items-center'>
            <Select value={settings.align} onValueChange={handleAlignChange}>
            <SelectTrigger className='w-[180px]'>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="left">{dict.settings.timetable.align.left}</SelectItem>
                <SelectItem value="center">{dict.settings.timetable.align.center}</SelectItem>
                <SelectItem value="right">{dict.settings.timetable.align.right}</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="block font-bold mb-2">{dict.settings.timetable.display}:</label>
        <div className="flex items-center mb-2">
            <div className='flex-1'>{dict.settings.timetable.slot_title}</div>
            <Switch
                checked={settings.display.title}
                onCheckedChange={() => handleDisplayChange('title')}
            />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>{dict.settings.timetable.slot_code}</div>
          <Switch
            checked={settings.display.code}
            onCheckedChange={() => handleDisplayChange('code')}
          />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>{dict.settings.timetable.slot_time}</div>
          <Switch
            checked={settings.display.time}
            onCheckedChange={() => handleDisplayChange('time')}
          />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>{dict.settings.timetable.slot_venue}</div>
          <Switch
            checked={settings.display.venue}
            onCheckedChange={() => handleDisplayChange('venue')}
          />
        </div>
      </div>
    </div>
  );
};

export default TimetablePreferences;