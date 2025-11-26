"use client";
import { useRef, useEffect } from "react";
import { useChatContext } from "./ChatProvider";
import { ChatMessage } from "./ChatMessage";
import { motion } from "framer-motion";

export function ChatMessages() {
  const { messages } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ChatMessage message={message} />
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
