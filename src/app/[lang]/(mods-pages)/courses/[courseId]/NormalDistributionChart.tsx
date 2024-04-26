'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

type NormalDistributionChartProps = {
    std: number;
    mean: number;
    range: 'percent' | 'gpa';
};

const NormalDistributionChart = ({ std, mean, range }: NormalDistributionChartProps) => {
    const calculateY = (x: number) => {
        // Normal distribution formula
        return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
    };

    const generateData = () => {
        const data = [];
        const [min, max] = range === 'percent' ? [0, 100] : [0, 4.3];
        const step = (max - min) / 1000;

        for (let x = min; x <= max; x += step) {
            data.push({
                x: x.toFixed(2),
                y: calculateY(x),
            });
        }
        return data;
    };

    const data = generateData();

    return (
        <LineChart width={600} height={300} data={data}>
            <XAxis dataKey="x" label={{ value: range === 'percent' ? "Grade (%)" : "GPA", position: 'insideBottomRight', offset: 0 }} />
            <YAxis />
            <Tooltip />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="y" stroke="#8884d8" fill="url(#colorGradient)" strokeWidth={1} />
            {/* <ReferenceLine x={95} stroke="red" label={{ value: 'A+', position: 'top' }} />
            <ReferenceLine x={60} stroke="red" label={{ value: 'C-', position: 'top' }} />
            <ReferenceLine x={mean} stroke="green" label={{ value: 'Mean', position: 'top' }} /> */}
            <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8884d8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
            </defs>
        </LineChart>
    );
};

export default NormalDistributionChart;
