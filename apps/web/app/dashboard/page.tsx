import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsRow from "../../components/dashboard/StatsRow";
import MonitorList from "../../components/dashboard/MonitorList";

export const metadata = {
  title: "Dashboard — Sentinel",
};

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-350">
          Stats
          <StatsRow />

          {/* Monitor list — full width */}
          <MonitorList />
        </div>
      </main>
    </>
  );
}
