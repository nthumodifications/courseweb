"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  AlarmClockCheck,
  MapPinned,
  MapPin,
  Phone,
  Clock,
  Info,
  Store,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import shops from "./shops.json"
import ShopItem from "./ShopItem";
import areas from "./areas.json";

const Shops = ({ data }: { data: Array<{ restaurants: Array<any> }> }) => {
  const shops = data.map((area) => area.restaurants).flat();

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterArea, setFilterArea] = useState("");

  return (
    <div className="p-8 mb-2">
      <div className="sticky top-8">
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
            <span className="font-bold">{`"${search}"`}</span>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Toggle
            className="flex items-center gap-2 border bg-background"
            pressed={filterOpen}
            onPressedChange={setFilterOpen}
          >
            <AlarmClockCheck size="16" />
            Open now
          </Toggle>
          {/* <Toggle className="flex items-center gap-2 border bg-background">
            <MapPinned size="16" />
            Near me
          </Toggle> */}
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Store size="16" />
                <SelectValue placeholder="Select area" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anywhere">Anywhere</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-12 py-4">
        {shops.map((shop) => (
          <ShopItem
            key={shop.name}
            shop={shop}
            filter={{ search: search, open: filterOpen, area: filterArea }}
          />
        ))}
      </div>
    </div>
  );
};

export default Shops;
