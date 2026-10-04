// app/messages/client.tsx
// Messaging center UI (class names from messaging-center.html) + live DM APIs

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import "@/styles/pages/messages.css";

type Convo = {
  _id: string;
  otherUser?: { _id: string; name: string; avatar: string } | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
};

type Msg = {
  _id: string;
  body: string;
  createdAt: string;
  mine?: boolean;
  status?: "sent" | "read" | "received" | string;
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Send timestamp under each bubble */
function formatSendTimestamp(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return time;
    const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${date} · ${time}`;
  } catch {
    return "";
  }
}

function formatListTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function showToast(message: string, type: "success" | "removed" | "info" = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  let icon = "fa-check-circle";
  if (type === "removed") icon = "fa-exclamation-triangle";
  if (type === "info") icon = "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export default function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c") || "";

  const [conversations, setConversations] = useState<Convo[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("Select a chat");
  const [otherAvatar, setOtherAvatar] = useState("/default-avatar.png");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [searchConvo, setSearchConvo] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kebabOpenId, setKebabOpenId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const loadInbox = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/conversations", {
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/?auth=login");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Failed to load conversations.");
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inbox.");
    } finally {
      setLoadingList(false);
    }
  }, [router]);

  const loadThread = useCallback(
    async (id: string) => {
      if (!id) {
        setMessages([]);
        setOtherName("Select a chat");
        return;
      }
      setLoadingThread(true);
      try {
        const res = await fetch(`/api/messages/conversations/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load messages.");
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        if (data.conversation?.otherUser) {
          setOtherName(data.conversation.otherUser.name || "Chat");
          setOtherAvatar(data.conversation.otherUser.avatar || "/default-avatar.png");
        }
        loadInbox();
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to load thread", "removed");
      } finally {
        setLoadingThread(false);
      }
    },
    [loadInbox]
  );

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
    else {
      setMessages([]);
      setOtherName("Select a chat");
    }
  }, [activeId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onDocClick = () => setKebabOpenId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const openConvo = (id: string) => router.push(`/messages?c=${id}`);

  const sendMessage = async () => {
    const body = text.trim();
    if (!activeId || !body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to send", "removed");
        return;
      }
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await loadThread(activeId);
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => {
    if (!searchConvo.trim()) return true;
    const q = searchConvo.toLowerCase();
    return (
      (c.otherUser?.name || "").toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <main className={`messaging-container${activeId ? " has-active-chat" : ""}`}>
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
            <div className="header-actions">
              <button type="button" className="filter-btn" title="Unread Messages" onClick={() => showToast("Unread filter coming soon", "info")}>
                <i className="fas fa-envelope" />
              </button>
              <button type="button" className="filter-btn" title="Starred Messages" onClick={() => showToast("Starred filter coming soon", "info")}>
                <i className="fas fa-star" />
              </button>
              <button type="button" className="new-chat-btn" title="New Message" onClick={() => showToast("Start a chat from an order", "info")}>
                <i className="fas fa-edit" />
              </button>
            </div>
          </div>

          <div className="search-chats">
            <i className="fas fa-search" />
            <input type="text" placeholder="Search conversations..." value={searchConvo} onChange={(e) => setSearchConvo(e.target.value)} />
          </div>

          {error && <p style={{ padding: "0 20px", color: "#e74c3c", fontSize: "0.85rem" }}>{error}</p>}

          <div className="conversation-list" id="conversationList">
            {loadingList ? (
              <p style={{ padding: 20, color: "#999" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: 20, color: "#999" }}>No conversations yet.</p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c._id}
                  className={`convo-item${activeId === c._id ? " active" : ""}`}
                  onClick={() => openConvo(c._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openConvo(c._id)}
                >
                  <div className="avatar-wrapper">
                    <Image src={c.otherUser?.avatar || "/default-avatar.png"} alt={c.otherUser?.name || "User"} width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  </div>
                  <div className="convo-info">
                    <div className="convo-top">
                      <span className="convo-name">{c.otherUser?.name || "User"}</span>
                      <span className="convo-time">{formatListTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="convo-bottom">
                      <p className="convo-preview">{c.lastMessage || "—"}</p>
                      <div className="convo-meta">
                        {(c.unread || 0) > 0 && <span className="unread-count">{c.unread}</span>}
                        <div className="kebab-menu-container" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="kebab-btn" onClick={(e) => { e.stopPropagation(); setKebabOpenId(kebabOpenId === c._id ? null : c._id); }}>
                            <i className="fas fa-ellipsis-v" />
                          </button>
                          <div className={`kebab-dropdown${kebabOpenId === c._id ? " active" : ""}`}>
                            <ul>
                              <li onClick={() => { setKebabOpenId(null); showToast("Coming soon", "info"); }}><i className="fas fa-envelope-open" /> Mark as unread</li>
                              <li onClick={() => { setKebabOpenId(null); showToast("Coming soon", "info"); }}><i className="fas fa-ban" /> Block user</li>
                              <li className="delete-opt" onClick={() => { setKebabOpenId(null); showToast("Coming soon", "info"); }}><i className="fas fa-trash" /> Delete chat</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="chat-main">
          <header className="chat-header">
            <button
              type="button"
              className="mobile-back-chat"
              title="Back to chats"
              onClick={() => router.push("/messages")}
              aria-label="Back to chats"
            >
              <i className="fas fa-arrow-left" />
            </button>
            <div className="chat-user-meta">
              <div className="avatar-small">
                <Image src={otherAvatar} alt={otherName} width={40} height={40} style={{ objectFit: "cover" }} />
              </div>
              <div>
                <h3 id="activeChatName">{otherName}</h3>
                <span className="status-text">{activeId ? "Conversation" : "—"}</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button type="button" title="Voice Call" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-phone" /></button>
              <button type="button" title="Video Call" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-video" /></button>
              <div className="header-divider" />
              <button type="button" title="Search in Chat" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-search" /></button>
              <button type="button" title="Star Chat" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-star" /></button>
              <button type="button" title="Archive Chat" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-archive" /></button>
              <button type="button" title="Block User" className="block-action" onClick={() => showToast("Coming soon", "info")}><i className="fas fa-user" /></button>
              <button type="button" id="toggleDetails" title="Info" onClick={() => setDetailsOpen((v) => !v)}><i className="fas fa-info-circle" /></button>
            </div>
          </header>

          <div className="chat-messages" id="chatMessages">
            {!activeId ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>Select a conversation to start messaging</p>
            ) : loadingThread ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>Loading messages…</p>
            ) : messages.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>No messages yet. Say hello.</p>
            ) : (
              <>
                <div className="date-divider">Messages</div>
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`message ${m.mine ? "msg-sent" : "msg-received"}`}
                    style={{ flexDirection: "column", alignItems: m.mine ? "flex-end" : "flex-start" }}
                  >
                    <div className="msg-bubble">
                      <div className="msg-text">{m.body}</div>
                    </div>
                    <span
                      className="msg-time"
                      title={
                        m.createdAt
                          ? new Date(m.createdAt).toLocaleString()
                          : undefined
                      }
                      style={{
                        display: "block",
                        marginTop: 4,
                        padding: "0 4px",
                        fontSize: "0.7rem",
                        color: "#999",
                        textAlign: m.mine ? "right" : "left",
                      }}
                    >
                      {formatSendTimestamp(m.createdAt)}
                      {m.mine ? (
                        <>
                          {" "}
                          {m.status === "read" ? (
                            <i
                              className="fas fa-check-double"
                              title="Read"
                              style={{ color: "#60a5fa" }}
                            />
                          ) : (
                            <i
                              className="fas fa-check"
                              title="Sent"
                              style={{ opacity: 0.7 }}
                            />
                          )}
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <footer className="chat-input-area">
            <div className="input-controls">
              <div className="input-actions">
                <button type="button" id="attachBtn" title="Attach File" onClick={() => showToast("Attachments coming soon", "info")}><i className="fas fa-paperclip" /></button>
                <button type="button" title="Emoji" onClick={() => showToast("Coming soon", "info")}><i className="far fa-smile" /></button>
              </div>
              <div className="input-wrapper">
                <textarea
                  id="messageInput"
                  ref={textareaRef}
                  placeholder={activeId ? "Type a message..." : "Select a chat first"}
                  rows={1}
                  value={text}
                  disabled={!activeId || sending}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              <button type="button" className="send-btn" id="sendBtn" disabled={!activeId || sending || !text.trim()} onClick={sendMessage}>
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </footer>

          <div className="blocked-notice">
            <i className="fas fa-ban" /> You have blocked this user. Unblock to send a message.
          </div>
        </section>

        <aside className={`detail-sidebar${detailsOpen ? "" : " collapsed"}`} id="detailSidebar">
          <div className="detail-content">
            <div className="detail-profile">
              <Image src={otherAvatar} alt={otherName} width={100} height={100} className="detail-avatar" style={{ borderRadius: "50%", objectFit: "cover" }} />
              <h3>{otherName}</h3>
              <p>{activeId ? "Member" : "—"}</p>
            </div>
            <div className="detail-stats">
              <div className="stat-card">
                <div className="stat-icon-circle"><i className="fas fa-comments" /></div>
                <div className="stat-content">
                  <span className="stat-label">Messages</span>
                  <strong className="stat-value">{activeId ? messages.length : "—"}</strong>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-circle"><i className="fas fa-clock" /></div>
                <div className="stat-content">
                  <span className="stat-label">Status</span>
                  <strong className="stat-value">{activeId ? "Active" : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="detail-media">
            <div className="media-header">
              <h4>Shared Media</h4>
              <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); showToast("Coming soon", "info"); }}>View All</a>
            </div>
            <div className="media-grid">
              <div className="media-item"><i className="fas fa-image" /></div>
              <div className="media-item"><i className="fas fa-play-circle" /></div>
              <div className="media-item"><i className="fas fa-file-alt" /></div>
            </div>
          </div>
        </aside>
      </main>
      <div id="toast-container" />
    </>
  );
}
