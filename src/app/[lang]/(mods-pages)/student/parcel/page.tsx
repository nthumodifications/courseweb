"use client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import {
  getOSAAccessToken,
  getOSACode,
  getParcelInformation,
} from "@/lib/headless_ais/inthu";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const ParcelPage = () => {
  const [tab, setTab] = useState("pending");
  const { ais, getACIXSTORE, user } = useHeadlessAIS();

  const {
    data: refresh,
    error: refreshError,
    isLoading: refreshLoading,
  } = useQuery({
    queryKey: ["osa_refreshtoken", user?.studentid],
    queryFn: async () => {
      const ACIXSTORE = await getACIXSTORE();
      if (!ACIXSTORE) {
        throw new Error("Failed to get token");
      }
      const res = await getOSACode(ACIXSTORE);
      if (!res) {
        throw new Error("Failed to get token");
      }
      return res;
    },
    // expire after 1 day
    staleTime: 86400000,
    // don't retry on error
    retry: false,
  });
  const {
    data: token,
    error: tokenError,
    isLoading: tokenLoading,
  } = useQuery({
    queryKey: ["osa_accesstoken", refresh?.user_id],
    queryFn: async () => {
      if (!refresh) {
        throw new Error("Refresh token not found");
      }
      const access = await getOSAAccessToken(
        refresh.user_id,
        refresh.refreshToken,
      );
      if (!access) {
        throw new Error("Failed to get token");
      }
      return { ...access, user_id: refresh.user_id };
    },
    // refresh every 1 hour
    refetchInterval: 3600000,
    enabled: !!refresh,
    // don't retry on error
    retry: false,
  });

  const {
    data: parcels = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["parcels", token?.user_id],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token not found");
      }
      const data = await getParcelInformation(
        token.authToken,
        token.deviceId,
        token.session_id,
      );
      return data;
    },
    enabled: !!token,
    // refresh only every 5 minutes,
    refetchInterval: 300000,
    // don't retry on error
    retry: false,
  });

  const pendingParcels = parcels.filter(
    (parcel) => parcel.statusText === "pending",
  );
  const archiveParcels = parcels.filter(
    (parcel) => parcel.statusText === "已取件",
  );

  const handleTabChange = (value: string) => {
    setTab(value);
  };
  return (
    <div className="flex flex-col px-4">
      <Tabs defaultValue="pending" value={tab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-evenly mb-4">
          <TabsTrigger className="flex-1" value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="archive">
            Archivee
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending"></TabsContent>
        <TabsContent value="archive">
          {archiveParcels.map((parcel) => (
            <div
              className="flex flex-col bg-white rounded-lg shadow-md p-4 mb-4"
              key={parcel.barcode}
            >
              <div className="flex flex-row gap-1">
                <Badge className="rounded-md" variant="secondary">
                  {parcel.statusText}
                </Badge>
                <span className="text-sm text-gray-500">{parcel.takeTime}</span>
              </div>
              <span className="text-lg font-semibold">{parcel.name}</span>
              <span className="text-sm text-gray-500">
                {parcel.studentNumber}
              </span>
              <span className="text-sm text-gray-500">
                {parcel.logistic} {parcel.barcode}
              </span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParcelPage;
