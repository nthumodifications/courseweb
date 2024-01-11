'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from 'react'
import { MapPin, Phone, Info } from 'lucide-react'

const getDay = () => {
  const now = new Date()
  const day = now.getDay()
  if(day == 0) return 'sunday'
  if(day == 6) return 'saturday'
  return 'weekday'
}

const Shops = ({ data }) => {

  return (
    <div className="grid md:grid-cols-[1fr_200px] gap-6 p-6">
      <div className="flex flex-col gap-4">
        {data.map(({ area, image, name, note, phone, schedule }, index) => 
          <div key={name || index}>
            <Card className="overflow-hidden flex">
              <div className="bg-blue-500 w-2"></div>
              <div className="w-full p-6 grid grid-cols-6 gap-4">
                <div className="">
                  <span className="bold">{schedule[getDay()]}</span>                
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <img className="h-16 w-16 rounded-full object-cover" src={image} />
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{name}</span>
                    <div className="flex items-center gap-1">
                      <MapPin size="16" />                    
                      <span className="text-sm">{area}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 flex flex-col">
                  <div className="flex items-center gap-1">
                    <Phone size="16" />
                    <span className="text-sm">{phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Info size="16" />
                    <span className="text-sm">{note}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 w-[200px]">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Filter</span>
        </div>
      </div>
    </div>
  )
}

export default Shops