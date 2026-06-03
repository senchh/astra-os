import { readAgents } from "@/lib/hermes/agents";
import ChatClient from "@/components/chat/chat-client";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const agents = readAgents();
  return <ChatClient agents={agents} />;
}
