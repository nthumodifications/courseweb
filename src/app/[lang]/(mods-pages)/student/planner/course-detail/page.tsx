import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CourseDetailPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="p-0">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回學分規劃
          </Link>
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-xl">
                GEC 130800 - 藝術經典：西洋藝術名作講述
              </CardTitle>
              <CardDescription>3學分 • 核心必修</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select defaultValue="planned">
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="課程狀態" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="in-progress">進行中</SelectItem>
                  <SelectItem value="planned">計劃中</SelectItem>
                  <SelectItem value="failed">未通過</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="111-2">
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="學期" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="111-1">111-1 (秋季學期)</SelectItem>
                  <SelectItem value="111-2">111-2 (春季學期)</SelectItem>
                  <SelectItem value="112-1">112-1 (秋季學期)</SelectItem>
                  <SelectItem value="112-2">112-2 (春季學期)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="info">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="info">課程資訊</TabsTrigger>
              <TabsTrigger value="requirements">畢業要求</TabsTrigger>
              <TabsTrigger value="notes">筆記</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">學期</p>
                    <p>111-2 (春季學期)</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">時間</p>
                    <p>週二 13:20-16:10</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">教師</p>
                    <p>王小明 教授</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">課程簡介</h3>
                <p className="text-gray-300">
                  本課程旨在介紹西洋藝術史上的重要作品，從古典時期到現代藝術，探討其歷史背景、藝術風格和文化意義。
                  通過對繪畫、雕塑和建築等藝術形式的分析，學生將學習如何欣賞和解讀藝術作品，並了解藝術如何反映社會變遷和人類思想的演變。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">課程目標</h3>
                <ul className="list-disc pl-5 text-gray-300 space-y-1">
                  <li>認識西洋藝術史的重要時期和流派</li>
                  <li>培養藝術鑑賞能力和批判性思考</li>
                  <li>理解藝術作品與其歷史文化背景的關係</li>
                  <li>學習藝術分析的基本方法和術語</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">評分方式</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-400">出席與參與</p>
                    <p className="text-xl font-medium">20%</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-400">期中報告</p>
                    <p className="text-xl font-medium">30%</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-400">期末考試</p>
                    <p className="text-xl font-medium">30%</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-400">小組專題</p>
                    <p className="text-xl font-medium">20%</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">先修課程</h3>
                <p className="text-gray-300">無</p>
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="pt-4">
              <div className="space-y-4">
                <div className="bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">畢業要求滿足情況</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>滿足「核心必修」要求</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>滿足「通識課程」要求</span>
                    </div>
                    <div className="flex items-center">
                      <X className="h-5 w-5 text-red-500 mr-2" />
                      <span>不滿足「英文領域」要求</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">先修課程檢查</h3>
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>無先修課程要求</span>
                  </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">衝堂檢查</h3>
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>
                      可能與「ECON100204 - 經濟學原理二」在週二 15:10-16:00 衝堂
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="pt-4">
              <div className="space-y-4">
                <textarea
                  className="w-full h-40 bg-gray-800 border border-gray-700 rounded-md p-3 text-white"
                  placeholder="在這裡添加關於這門課的筆記..."
                ></textarea>
                <Button>保存筆記</Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 border-t border-gray-700">
            <Button variant="destructive">移除課程</Button>
            <div className="space-x-2">
              <Button variant="outline">複製到其他學期</Button>
              <Button>保存更改</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
