import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Send, User as UserIcon, Clock, ShieldCheck, CheckCheck, Loader2, MessageCircle, Smile, Paperclip, X, Trash2, Edit2, Play, File as FileIcon, Image as ImageIcon, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read userId from URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const initialUserId = urlParams.get('userId') || urlParams.get('user');

  // Fetch conversations (left sidebar)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
  });

  // If the initialUserId is not in conversations (new chat), fetch their info
  const { data: newUserInfo } = useQuery({
    queryKey: ["/api/users", initialUserId],
    enabled: !!initialUserId && !conversations.some((c: any) => String(c.id) === String(initialUserId)),
    queryFn: async () => {
      const res = await fetch(`/api/users/${initialUserId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    }
  });

  // Build display list: existing conversations + possibly the new target user
  const displayConversations = [...conversations];
  if (newUserInfo && !displayConversations.some(c => String(c.id) === String(newUserInfo.id))) {
    displayConversations.unshift(newUserInfo);
  }

  // Select from URL or first conversation
  useEffect(() => {
    if (initialUserId && !selectedUserId) {
      setSelectedUserId(initialUserId);
    } else if (!selectedUserId && conversations.length > 0) {
      setSelectedUserId(conversations[0].id);
    }
  }, [conversations, initialUserId]);

  // Fetch messages for selected conversation (right panel)
  const { data: messages = [], isLoading: loadingMessages } = useQuery<any[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  // Fetch settings to check if edit/delete is allowed
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Send message mutation — uses apiRequest which includes CSRF token
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("receiverId", String(selectedUserId));
      
      if (editingMessageId) {
        // Edit message
        const res = await apiRequest("PUT", `/api/messages/${editingMessageId}`, { content: messageText.trim() });
        return res.json();
      }

      if (messageText.trim()) {
        formData.append("content", messageText.trim());
      }
      if (attachment) {
        formData.append("attachment", attachment);
      }
      
      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      setAttachment(null);
      setEditingMessageId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    if ((!messageText.trim() && !attachment) || !selectedUserId) return;
    sendMessageMutation.mutate();
  };

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await apiRequest("DELETE", `/api/messages/${messageId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      toast({ title: "Message deleted" });
    }
  });

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
        return;
      }
      setAttachment(file);
    }
  };

  const handleEditClick = (msg: any) => {
    setEditingMessageId(msg.id);
    setMessageText(msg.content);
  };

  // Find the selected user in display list (compare as strings to handle number/string mismatch)
  const selectedUser = displayConversations.find((c: any) => String(c.id) === String(selectedUserId));

  // Contact Support handler
  const handleContactSupport = async () => {
    try {
      const res = await fetch("/api/admin-contact", { credentials: "include" });
      if (res.ok) {
        const adminInfo = await res.json();
        // Add to display list if not present
        if (!displayConversations.some(c => String(c.id) === String(adminInfo.id))) {
          displayConversations.unshift(adminInfo);
        }
        setSelectedUserId(adminInfo.id);
        // Update URL without full reload
        window.history.replaceState(null, "", `/messages?userId=${adminInfo.id}`);
      } else {
        toast({ title: "Error", description: "Could not reach support.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not reach support.", variant: "destructive" });
    }
  };

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
            {/* Contact Support button (visible to students and teachers) */}
            {user?.role !== "admin" && (
              <div className="p-2 pb-0">
                <button
                  onClick={handleContactSupport}
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
              </div>
            )}
            
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
                      String(selectedUserId) === String(conv.id)
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar className={`h-10 w-10 border-2 ${String(selectedUserId) === String(conv.id) ? 'border-primary-foreground/20' : 'border-background'}`}>
                      <AvatarImage src={conv.profileImageUrl} />
                      <AvatarFallback className={String(selectedUserId) === String(conv.id) ? "bg-primary-foreground/20 text-white" : ""}>
                        {conv.firstName?.[0]}{conv.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">
                        {conv.firstName} {conv.lastName}
                      </p>
                      <p className={`text-xs capitalize flex items-center gap-1 ${String(selectedUserId) === String(conv.id) ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
                    {selectedUser.role === 'admin' && <span className="text-red-500 flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Platform Admin</span>}
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
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50 py-16">
                    <MessageCircle className="w-16 h-16" />
                    <p>This is the beginning of your direct conversation.</p>
                    <p className="text-sm">Type a message below to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg: any) => {
                        const isMe = String(msg.senderId) === String(user?.id);
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex flex-col relative group ${isMe ? "items-end" : "items-start"}`}
                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`max-w-md rounded-2xl px-4 py-3 shadow-sm ${
                                isMe 
                                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                  : "bg-card border border-border/50 text-foreground rounded-tl-sm"
                              } ${msg.isDeleted ? 'opacity-50 italic bg-muted/50 text-muted-foreground' : ''}`}>
                                
                                {msg.isDeleted ? (
                                  <p className="text-sm flex items-center gap-2"><Trash2 className="h-3 w-3" /> This message was deleted</p>
                                ) : (
                                  <>
                                    {msg.attachmentId && (
                                      <div className="mb-2 max-w-[200px] overflow-hidden rounded-md border border-white/20">
                                        {msg.attachmentType?.startsWith('image/') ? (
                                          <img src={`/api/attachments/${msg.attachmentId}`} alt="attachment" className="w-full h-auto object-cover" />
                                        ) : msg.attachmentType?.startsWith('video/') ? (
                                          <video src={`/api/attachments/${msg.attachmentId}`} controls className="w-full h-auto" />
                                        ) : (
                                          <a href={`/api/attachments/${msg.attachmentId}`} download className="flex items-center gap-2 p-2 bg-black/10 hover:bg-black/20 rounded transition-colors">
                                            <FileIcon className="h-4 w-4" />
                                            <span className="text-xs truncate">{msg.attachmentName || 'Download File'}</span>
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    <p className="whitespace-pre-wrap text-sm break-words">{msg.content}</p>
                                    {msg.isEdited && <span className="text-[10px] opacity-70 ml-2">(edited)</span>}
                                  </>
                                )}
                              </div>

                              {/* Hover Context Menu */}
                              {isMe && !msg.isDeleted && hoveredMessageId === msg.id && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {settings?.allowMessageEdit !== "false" && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEditClick(msg)}>
                                      <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                  )}
                                  {settings?.allowMessageDelete !== "false" && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10" onClick={() => deleteMessageMutation.mutate(msg.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground ${isMe ? "flex-row-reverse" : ""}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && (
                                msg.status === 'read' ? <CheckCheck className="w-3 h-3 ml-1 text-blue-500" /> :
                                msg.status === 'delivered' ? <CheckCheck className="w-3 h-3 ml-1" /> :
                                <CheckCheck className="w-3 h-3 ml-1 opacity-50" />
                              )}
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
              <div className="p-4 border-t bg-card flex flex-col">
                {/* Editing indicator */}
                {editingMessageId && (
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded-t-lg border-l-4 border-primary mb-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Edit2 className="h-4 w-4" />
                      <span>Editing message</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => { setEditingMessageId(null); setMessageText(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Attachment indicator */}
                {attachment && (
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded-t-lg border-l-4 border-blue-500 mb-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{attachment.name}</span>
                      <span className="text-xs opacity-70">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex gap-2 relative items-end">
                  <div className="flex-1 flex items-center bg-muted/50 border rounded-2xl shadow-inner pr-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground">
                          <Smile className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="start" className="w-auto p-0 border-none shadow-xl mb-2">
                        <EmojiPicker onEmojiClick={handleEmojiClick} theme="auto" />
                      </PopoverContent>
                    </Popover>

                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>

                    <Input
                      placeholder={editingMessageId ? "Edit message..." : "Type your message here..."}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-2 h-12"
                      disabled={sendMessageMutation.isPending}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="icon"
                    className="rounded-full w-12 h-12 shrink-0 shadow-md hover:shadow-lg transition-all"
                    disabled={(!messageText.trim() && !attachment) || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 ml-1" />
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
