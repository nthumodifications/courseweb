import React from 'react';
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Clock, Info } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface ShopItemProps {
  shop: {
    image: string;
    name: string;
    area: string;
    phone?: string;
    schedule: { [key: string]: string };
    note?: string;
  },
  filter: {
    search: string;
    open: boolean;
    area: string;
  };
}

const checkOpen = (schedule: string) => {
  if (schedule == "24小時") {
    return [true, '營業中，24小時營業']
  }
  if (schedule == "") {
    return [false, '今日休息']
  }
  if (schedule.includes(',')) {
    let timeslots = schedule.split(',')
    let now = new Date()
    let nowTime = now.getHours() * 60 + now.getMinutes()
    for (let i = 0; i < timeslots.length; i++) {
      let [start, end] = timeslots[i].split('-')
      let [startHour, startMin] = start.split(':').map(Number)
      let [endHour, endMin] = end.split(':').map(Number)
      let startTime = startHour * 60 + startMin
      let endTime = endHour * 60 + endMin
      if (nowTime >= startTime && nowTime <= endTime) {
        return [true, `營業中，剩餘${endHour - now.getHours()}小時${endMin - now.getMinutes()}分`]
      }
      else {
        return [false, `休息中，將於${startHour}點${startMin}分開始營業`]
      }
    }
  }
  if (schedule.includes('-')) {
    let [start, end] = schedule.split('-')
    let [startHour, startMin] = start.split(':').map(Number)
    let [endHour, endMin] = end.split(':').map(Number)
    let now = new Date()
    let nowTime = now.getHours() * 60 + now.getMinutes()
    let startTime = startHour * 60 + startMin
    let endTime = endHour * 60 + endMin
    if (nowTime >= startTime && nowTime <= endTime) {
      return [true, `營業中，剩餘${endHour - now.getHours()}小時${endMin - now.getMinutes()}分`]
    }
    else {
      return [false, `休息中，將於${startHour}點${startMin}分開始營業`]
    }
  }
  return [false, 'No info']
}

const ShopItem: React.FC<ShopItemProps> = ({ shop, filter }) => {
  const days = ['sunday', 'weekday', 'weekday', 'weekday', 'weekday', 'weekday', 'saturday']
  const today = days[new Date().getDay()]

  let [isOpen, msg] = checkOpen(shop.schedule[today])

  if (filter && filter.search && !shop.name.toLowerCase().includes(filter.search.toLowerCase())) {
    return null
  }

  if (filter && filter.open && !isOpen) {
    return null
  }

  if (filter && filter.area && filter.area !== shop.area && filter.area !== 'anywhere') {
    return null
  }

  return (
    <div className="flex gap-6">
      <div className="flex flex-col">
        <img src={shop.image} alt={shop.name} className="w-32 h-32 rounded-3xl object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex flex-col">
          <span className="font-bold text-xl">{shop.name}</span>
          <div className="flex items-center gap-1">
            <MapPin size="14" />
            <span className="text-muted-foreground text-sm">{shop.area}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {isOpen ?
              <div className="flex gap-2 items-center">
                <Badge>Open</Badge>
                <span className="text-muted-foreground text-sm">{msg}</span>
              </div>
              :
              <div className="flex gap-2 items-center">
                <Badge variant="destructive">Closed</Badge> 
                <span className="text-muted-foreground text-sm">{msg}</span>
              </div>
            }
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <Phone size="14" />
            <span className="text-muted-foreground text-sm">{shop.phone || '無'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size="14" />
            <span className="text-muted-foreground text-sm">{shop.schedule[today] || '今日休息'}</span>
          </div>
          {shop.note && (
            <div className="flex items-center gap-1">
              <Info size="14" />
              <span className="text-muted-foreground text-sm">{shop.note}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopItem;
