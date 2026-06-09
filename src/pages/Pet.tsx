import { AppLayout } from "@/components/AppLayout";
import { PetChat } from "@/components/pet/PetChat";

export default function Pet() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] border rounded-xl overflow-hidden shadow-sm bg-card">
        <PetChat showHeader showResetButton={false} />
      </div>
    </AppLayout>
  );
}
