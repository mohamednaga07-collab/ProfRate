import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Send, User as UserIcon, Clock, ShieldCheck, CheckCheck, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export default function Messages() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageText]); // actually we want to trigger this when messages change, handled below

  // Fetch conversations (left sidebar)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialUserId = urlParams.get('userId') || urlParams.get('user');

  // Select first conversation automatically if none selected, OR select from URL
  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    } else if (!selectedUserId && conversations.length > 0) {
      setSelectedUserId(conversations[0].id);
    }
  }, [conversations, selectedUserId, initialUserId]);

  // If the initialUserId is not in conversations (new chat), fetch their info
  const { data: newUserInfo } = useQuery({
    queryKey: ["/api/users", initialUserId],
    enabled: !!initialUserId && !conversations.some((c: any) => c.id === initialUserId),
    queryFn: async () => {
      const res = await fetch(`/api/users/${initialUserId}`);
      if (!res.ok) return null;
      return res.json();
    }
  });

  const displayConversations = [...conversations];
  if (newUserInfo && !displayConversations.some(c => c.id === newUserInfo.id)) {
    displayConversations.unshift(newUserInfo);
  }

  // Fetch messages for selected conversation (right panel)
  const { data: messages = [], isLoading: loadingMessages } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUserId,
          content,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const selectedUser = displayConversations.find((c: any) => c.id === selectedUserId);

  return (
    <div className="container mx-auto p-4 max-w-6xl mt-20 h-[calc(100vh-120px)] flex">
      <div className="bg-card w-full flex rounded-2xl shadow-xl overflow-hidden border border-border/50">
        
        {/* Left Sidebar - Conversations */}
        <div className="w-1/3 border-r bg-muted/20 flex flex-col">
          <div className="p-4 border-b bg-card">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
              Messages
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Secure, private communication
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 pb-0">
              {user?.role !== "admin" && (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/admin-contact");
                    if (res.ok) {
                      const adminInfo = await res.json();
                      setLocation(`/messages?userId=${adminInfo.id}`);
                      setSelectedUserId(adminInfo.id);
                    }
                  }}
                  className="w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 mb-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                >
                  <div className="bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center border-2 border-background">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">Contact Support</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Platform Administration
                    </p>
                  </div>
                </button>
              )}
            </div>
            
            {loadingConversations ? (
              <div className="flex justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : displayConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserIcon className="h-6 w-6 opacity-50" />
                </div>
                <p>No active conversations yet.</p>
                {user?.role === "student" && (
                  <p className="text-sm mt-2">Visit a professor's profile to start a chat.</p>
                )}
                {user?.role === "teacher" && (
                  <p className="text-sm mt-2">You will see messages here when students contact you.</p>
                )}
                {user?.role === "admin" && (
                  <p className="text-sm mt-2">Visit Manage Users to message a specific user.</p>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {displayConversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedUserId(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                      selectedUserId === conv.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar className={`h-10 w-10 border-2 ${selectedUserId === conv.id ? 'border-primary-foreground/20' : 'border-background'}`}>
                      <AvatarImage src={conv.profileImageUrl} />
                      <AvatarFallback className={selectedUserId === conv.id ? "bg-primary-foreground/20 text-white" : ""}>
                        {conv.firstName?.[0]}{conv.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">
                        {conv.firstName} {conv.lastName}
                      </p>
                      <p className={`text-xs capitalize flex items-center gap-1 ${selectedUserId === conv.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {conv.role === 'teacher' ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {conv.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="w-2/3 flex flex-col bg-card relative">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3 bg-card z-10 shadow-sm">
                <Avatar className="h-10 w-10 border shadow-sm">
                  <AvatarImage src={selectedUser.profileImageUrl} />
                  <AvatarFallback>{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 capitalize">
                    {selectedUser.role}
                    {selectedUser.role === 'teacher' && <span className="text-green-500 flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Educator</span>}
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4 bg-muted/10">
                {loadingMessages ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
                    <MessageCircle className="w-16 h-16" />
                    <p>This is the beginning of your direct conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg: any) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                              isMe 
                                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                : "bg-card border border-border/50 text-foreground rounded-tl-sm"
                            }`}>
                              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground ${isMe ? "flex-row-reverse" : ""}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && msg.isRead && <CheckCheck className="w-3 h-3 ml-1 text-blue-500" />}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t bg-card">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                  <Input
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 rounded-full px-6 shadow-inner"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="rounded-full w-10 h-10 shadow-md hover:shadow-lg transition-all"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </form>
                {user?.role === "teacher" && (
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    Teachers can only reply to existing conversations initiated by students.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6 border-8 border-background shadow-inner">
                <Send className="w-8 h-8 opacity-50 ml-1" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Your Messages</h3>
              <p className="max-w-xs text-center text-sm">
                Select a conversation from the sidebar to view your messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

