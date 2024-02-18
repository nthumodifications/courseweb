'use client';
import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Search, AlarmClockCheck, MapPinned, MapPin, Phone, Clock, Info, Store } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import shops from "./shops.json"

const Shops = () => {

  const days = ['sunday', 'weekday', 'weekday', 'weekday', 'weekday', 'weekday', 'saturday']
  const today = days[new Date().getDay()]

  const [search, setSearch] = useState('')

  return (
    <div className="p-8 mb-2">

      <div className="sticky top-8 bg-background">
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg">
          <Search />
          <Input
            type="text"
            placeholder="Search for shops"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="mt-4">
            <span>Search results for </span>
            <span className="font-bold">"{search}"</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Toggle className="flex items-center gap-2 border bg-background">
            <AlarmClockCheck size="16" />
            Open now
          </Toggle>
          <Toggle className="flex items-center gap-2 border bg-background">
            <MapPinned size="16" />
            Near me
          </Toggle>
          <Select>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Store size="16" />
                <SelectValue placeholder="Select area" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">a</SelectItem>
              <SelectItem value="dark">b</SelectItem>
              <SelectItem value="system">c</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-12 py-4">
        {shops.map((shop, index) => (
          <div className="flex gap-6">
            <div className="flex flex-col">
              <img src={shop.image} alt={shop.name} className="w-32 h-32 rounded-3xl object-cover" />
              <div className="flex justify-center -translate-y-3">
                <Badge
                  variant={shop.schedule[today] ? 'default' : 'destructive'}
                  className="text-sm"
                >
                  {shop.schedule[today] ? 'Open' : 'Closed'}
                </Badge>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col">
                <span className="font-bold text-xl">{shop.name}</span>
                <div className="flex items-center gap-1">
                  <MapPin size="14" />
                  <span className="text-muted-foreground text-sm">{shop.area}</span>
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
        ))}
      </div>

    </div>
  )
}

export default Shops