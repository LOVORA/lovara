import AuthGuard from "@/components/auth/auth-guard";
import ChatsList from "@/components/chat/chats-list";

export default function ChatsPage() {
  return (
    <>
      <Navbar />
      <ChatsPageClient />
    </>
  );
}
