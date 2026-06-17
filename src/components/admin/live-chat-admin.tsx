import { MessageCircle } from "lucide-react";
import { ChatInbox } from "@/components/chat-inbox";

export function LiveChatAdmin() {
  return (
    <div className="space-y-4">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><MessageCircle className="h-5 w-5 text-admin" /> Live Chat</h2><p className="text-sm text-muted-foreground">Reply to customers chatting from any portal — WhatsApp style.</p></div>
      <ChatInbox filter="live-admin" />
    </div>
  );
}
