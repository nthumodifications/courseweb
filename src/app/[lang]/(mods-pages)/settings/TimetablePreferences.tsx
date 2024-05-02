import React, { useState } from 'react';
import {TimetableDisplayPreferences} from '@/hooks/contexts/useUserTimetable';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsControlProps {
    settings: TimetableDisplayPreferences;
    onSettingsChange: (settings: TimetableDisplayPreferences) => void;
}

const TimetablePreferences: React.FC<SettingsControlProps> = ({
    settings,
    onSettingsChange,
}) => {

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
          Language:
        </label>
        <div className='flex items-center'>
            <Select value={settings.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className='w-[180px]'>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="app">App</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="en">English</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>

      <div className="flex flex-row">
        <label htmlFor="align" className="block font-bold flex-1">
          Align:
        </label>
        <div className='flex items-center'>
            <Select value={settings.align} onValueChange={handleAlignChange}>
            <SelectTrigger className='w-[180px]'>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="block font-bold mb-2">Display:</label>
        <div className="flex items-center mb-2">
            <div className='flex-1'>Title</div>
            <Switch
                checked={settings.display.title}
                onCheckedChange={() => handleDisplayChange('title')}
            />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>Code</div>
          <Switch
            checked={settings.display.code}
            onCheckedChange={() => handleDisplayChange('code')}
          />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>Time</div>
          <Switch
            checked={settings.display.time}
            onCheckedChange={() => handleDisplayChange('time')}
          />
        </div>
        <div className="flex items-center mb-2">
            <div className='flex-1'>Venue</div>
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