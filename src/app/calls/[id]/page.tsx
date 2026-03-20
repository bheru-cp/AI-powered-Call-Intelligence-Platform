import { SiteHeader } from "@/components/site-header";
import { CallDetailView } from "@/components/call-detail-view";

type Props = { params: Promise<{ id: string }> };

export default async function CallPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <CallDetailView callId={id} />
      </main>
    </div>
  );
}
