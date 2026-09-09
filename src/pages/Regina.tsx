import { AppLayout } from "@/components/AppLayout";
import { ReginaChat } from "@/components/regina/ReginaChat";

export default function Regina() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] border rounded-xl overflow-hidden shadow-sm bg-card">
        <ReginaChat showHeader showResetButton={false} />
      </div>
    </AppLayout>
  );
}
