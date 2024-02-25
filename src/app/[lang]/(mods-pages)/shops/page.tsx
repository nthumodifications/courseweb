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
import ShopItem from "./ShopItem"
import areas from "./areas.json"
import useDictionary from '@/dictionaries/useDictionary';

const Shops = () => {
  const dict = useDictionary();
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterArea, setFilterArea] = useState('')

  return (
    <div className="p-8 mb-2">

      <div className="sticky top-8">
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-lg">
          <Search />
          <Input
            type="text"
            placeholder={dict.shops.search_placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <div className="mt-4">
            <span>{dict.shops.search_results_prefix} </span>
            <span className="font-bold">"{search}"</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Toggle className="flex items-center gap-2 border bg-background" pressed={filterOpen} onPressedChange={setFilterOpen}>
            <AlarmClockCheck size="16" />
            {dict.shops.open_now}
          </Toggle>
          {/* <Toggle className="flex items-center gap-2 border bg-background">
            <MapPinned size="16" />
            Near me
          </Toggle> */}
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Store size="16" />
                <SelectValue placeholder={dict.shops.area_placeholder} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anywhere">{dict.shops.area_all}</SelectItem>
              {areas.map((area) => (
                <SelectItem value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-12 py-4">
        {shops.map((shop, index) => (
          <ShopItem shop={shop} filter={{ search: search, open: filterOpen, area: filterArea }} />
        ))}
      </div>

    </div>
  )
}

export default Shops