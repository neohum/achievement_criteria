import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import MainBoard from "@/components/MainBoard";
import { fetchAchievementData } from "@/utils/fetchData";
import { BoardProvider } from "@/contexts/BoardContext";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialData = await fetchAchievementData();

  return (
    <BoardProvider boardId={id} initialCriteria={initialData}>
      <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
        <TopBar />
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden w-full h-full">
          <MainBoard />
          <Sidebar />
        </div>
      </div>
    </BoardProvider>
  );
}
