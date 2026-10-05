// app/messages/client.tsx
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
  starred?: boolean;
  archived?: boolean;
  blocked?: boolean;
};

type Attachment = { url: string; name: string; mime?: string; size?: number };

type Msg = {
  _id: string;
  body: string;
  createdAt: string;
  mine?: boolean;
  status?: "sent" | "read" | "received" | string;
  attachments?: Attachment[];
};

type PendingFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string; // data URL for send/preview
  isImage: boolean;
};

const EMOJIS = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘",
  "😗","😋","😜","🤔","😎","🤩","🥳","😏","😒","🙄","😬","😢","😭","😤",
  "😠","🤯","😴","👍","👎","👏","🙏","🔥","✨","💯","❤️","🧡","💛","💚",
  "💙","💜","🖤","🤍","💔","✅","❌","⭐","🎉","💪","🤝","👀","💬","📎",
];

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

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c") || "";

  const [conversations, setConversations] = useState<Convo[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("Select a chat");
  const [otherAvatar, setOtherAvatar] = useState("/default-avatar.png");
  const [threadStarred, setThreadStarred] = useState(false);
  const [threadArchived, setThreadArchived] = useState(false);
  const [threadBlocked, setThreadBlocked] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [searchConvo, setSearchConvo] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "starred" | "archived">("all");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kebabOpenId, setKebabOpenId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const qs =
        listFilter === "all" ? "" : `?filter=${encodeURIComponent(listFilter)}`;
      const res = await fetch(`/api/messages/conversations${qs}`, {
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
  }, [router, listFilter]);

  const loadThread = useCallback(
    async (id: string) => {
      if (!id) {
        setMessages([]);
        setOtherName("Select a chat");
        setThreadStarred(false);
        setThreadArchived(false);
        setThreadBlocked(false);
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
          setOtherAvatar(
            data.conversation.otherUser.avatar || "/default-avatar.png"
          );
        }
        setThreadStarred(!!data.conversation?.starred);
        setThreadArchived(!!data.conversation?.archived);
        setThreadBlocked(!!data.conversation?.blocked);
        loadInbox();
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "Failed to load thread",
          "removed"
        );
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
      setThreadBlocked(false);
    }
  }, [activeId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onDocClick = () => {
      setKebabOpenId(null);
      setEmojiOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const openConvo = (id: string) => router.push(`/messages?c=${id}`);

  const convoAction = async (
    id: string,
    action: "star" | "unstar" | "archive" | "unarchive" | "block" | "unblock"
  ) => {
    try {
      const res = await fetch(`/api/messages/conversations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Action failed", "removed");
        return;
      }
      if (id === activeId) {
        setThreadStarred(!!data.starred);
        setThreadArchived(!!data.archived);
        setThreadBlocked(!!data.blocked);
      }
      const labels: Record<string, string> = {
        star: "Chat starred",
        unstar: "Star removed",
        archive: "Chat archived",
        unarchive: "Chat restored",
        block: "User blocked",
        unblock: "User unblocked",
      };
      showToast(labels[action] || "Updated", action.includes("block") && action === "block" ? "removed" : "success");
      if (action === "archive") {
        router.push("/messages");
      }
      await loadInbox();
    } catch {
      showToast("Network error", "removed");
    }
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const next: PendingFile[] = [];
    for (const file of files.slice(0, 5)) {
      if (file.size > 1_500_000) {
        showToast(`${file.name} is too large (max ~1.5MB)`, "removed");
        continue;
      }
      try {
        const url = await readFileAsDataURL(file);
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}`,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          url,
          isImage: file.type.startsWith("image/"),
        });
      } catch {
        showToast(`Could not read ${file.name}`, "removed");
      }
    }
    if (next.length) {
      setPendingFiles((prev) => [...prev, ...next].slice(0, 5));
      showToast(`${next.length} file(s) ready to send`, "info");
    }
  };

  const removePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const insertEmoji = (emoji: string) => {
    setText((t) => t + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const sendMessage = async () => {
    const body = text.trim();
    if (!activeId || sending) return;
    if (!body && pendingFiles.length === 0) return;
    if (threadBlocked) {
      showToast("Unblock this user to send messages", "removed");
      return;
    }

    setSending(true);
    try {
      const attachments = pendingFiles.map((f) => ({
        url: f.url,
        name: f.name,
        mime: f.mime,
        size: f.size,
      }));
      const res = await fetch(`/api/messages/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body, attachments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to send", "removed");
        if (data.blocked) setThreadBlocked(true);
        return;
      }
      setText("");
      setPendingFiles([]);
      setEmojiOpen(false);
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
      <main className={`messaging-container${activeId ? " has-active-chat" : ""}${threadBlocked ? " user-is-blocked" : ""}`}>
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
            <div className="header-actions">
              <button
                type="button"
                className={`filter-btn${listFilter === "all" ? " is-active-filter" : ""}`}
                title="All messages"
                onClick={() => setListFilter("all")}
              >
                <i className="fas fa-envelope" />
              </button>
              <button
                type="button"
                className={`filter-btn${listFilter === "starred" ? " is-active-filter" : ""}`}
                title="Starred"
                onClick={() => setListFilter("starred")}
              >
                <i className="fas fa-star" />
              </button>
              <button
                type="button"
                className={`filter-btn${listFilter === "archived" ? " is-active-filter" : ""}`}
                title="Archived"
                onClick={() => setListFilter("archived")}
              >
                <i className="fas fa-archive" />
              </button>
            </div>
          </div>

          <div className="search-chats">
            <div className="search-chats-inner">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchConvo}
                onChange={(e) => setSearchConvo(e.target.value)}
                aria-label="Search conversations"
              />
            </div>
          </div>

          {error && (
            <p style={{ padding: "0 20px", color: "#e74c3c", fontSize: "0.85rem" }}>
              {error}
            </p>
          )}

          <div className="conversation-list" id="conversationList">
            {loadingList ? (
              <p style={{ padding: 20, color: "#999" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: 20, color: "#999" }}>
                {listFilter === "starred"
                  ? "No starred chats."
                  : listFilter === "archived"
                    ? "No archived chats."
                    : "No conversations yet."}
              </p>
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
                    <Image
                      src={c.otherUser?.avatar || "/default-avatar.png"}
                      alt={c.otherUser?.name || "User"}
                      width={48}
                      height={48}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  </div>
                  <div className="convo-info">
                    <div className="convo-top">
                      <span className="convo-name">
                        {c.starred ? "★ " : ""}
                        {c.otherUser?.name || "User"}
                      </span>
                      <span className="convo-time">
                        {formatListTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="convo-bottom">
                      <p className="convo-preview">{c.lastMessage || "—"}</p>
                      <div className="convo-meta">
                        {(c.unread || 0) > 0 && (
                          <span className="unread-count">{c.unread}</span>
                        )}
                        <div
                          className="kebab-menu-container"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="kebab-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setKebabOpenId(kebabOpenId === c._id ? null : c._id);
                            }}
                          >
                            <i className="fas fa-ellipsis-v" />
                          </button>
                          <div
                            className={`kebab-dropdown${kebabOpenId === c._id ? " active" : ""}`}
                          >
                            <ul>
                              <li
                                onClick={() => {
                                  setKebabOpenId(null);
                                  convoAction(c._id, c.starred ? "unstar" : "star");
                                }}
                              >
                                <i className="fas fa-star" />{" "}
                                {c.starred ? "Unstar" : "Star"}
                              </li>
                              <li
                                onClick={() => {
                                  setKebabOpenId(null);
                                  convoAction(
                                    c._id,
                                    c.archived ? "unarchive" : "archive"
                                  );
                                }}
                              >
                                <i className="fas fa-archive" />{" "}
                                {c.archived ? "Unarchive" : "Archive"}
                              </li>
                              <li
                                onClick={() => {
                                  setKebabOpenId(null);
                                  convoAction(c._id, c.blocked ? "unblock" : "block");
                                }}
                              >
                                <i className="fas fa-ban" />{" "}
                                {c.blocked ? "Unblock" : "Block"}
                              </li>
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
                <Image
                  src={otherAvatar}
                  alt={otherName}
                  width={40}
                  height={40}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <h3 id="activeChatName">{otherName}</h3>
                <span className="status-text">
                  {threadBlocked
                    ? "Blocked"
                    : activeId
                      ? "Conversation"
                      : "—"}
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                title="Voice Call"
                onClick={() =>
                  showToast("Voice calls require WebRTC — coming in a later release", "info")
                }
              >
                <i className="fas fa-phone" />
              </button>
              <button
                type="button"
                title="Video Call"
                onClick={() =>
                  showToast("Video calls require WebRTC — coming in a later release", "info")
                }
              >
                <i className="fas fa-video" />
              </button>
              <div className="header-divider" />
              <button
                type="button"
                title={threadStarred ? "Unstar Chat" : "Star Chat"}
                onClick={() => {
                  if (!activeId) return;
                  convoAction(activeId, threadStarred ? "unstar" : "star");
                }}
                style={{ color: threadStarred ? "#f5a623" : undefined }}
              >
                <i className={threadStarred ? "fas fa-star" : "far fa-star"} />
              </button>
              <button
                type="button"
                title={threadArchived ? "Unarchive Chat" : "Archive Chat"}
                onClick={() => {
                  if (!activeId) return;
                  convoAction(activeId, threadArchived ? "unarchive" : "archive");
                }}
              >
                <i className="fas fa-archive" />
              </button>
              <button
                type="button"
                title={threadBlocked ? "Unblock User" : "Block User"}
                className={threadBlocked ? "block-action is-blocking" : "block-action"}
                onClick={() => {
                  if (!activeId) return;
                  convoAction(activeId, threadBlocked ? "unblock" : "block");
                }}
              >
                <i className={threadBlocked ? "fas fa-user-slash" : "fas fa-user"} />
              </button>
              <button
                type="button"
                id="toggleDetails"
                title="Info"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                <i className="fas fa-info-circle" />
              </button>
            </div>
          </header>

          <div className="chat-messages" id="chatMessages">
            {!activeId ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
                Select a conversation to start messaging
              </p>
            ) : loadingThread ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
                Loading messages…
              </p>
            ) : messages.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
                No messages yet. Say hello.
              </p>
            ) : (
              <>
                <div className="date-divider">Messages</div>
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`message ${m.mine ? "msg-sent" : "msg-received"}`}
                    style={{
                      flexDirection: "column",
                      alignItems: m.mine ? "flex-end" : "flex-start",
                    }}
                  >
                    <div className="msg-bubble">
                      {(m.attachments || []).map((a, i) =>
                        a.mime?.startsWith("image/") ||
                        a.url?.startsWith("data:image") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={a.url}
                            alt={a.name}
                            style={{
                              maxWidth: "100%",
                              borderRadius: 8,
                              marginBottom: 6,
                              display: "block",
                            }}
                          />
                        ) : (
                          <a
                            key={i}
                            href={a.url}
                            download={a.name}
                            className="msg-attachment-item"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="fas fa-file-alt" />
                            <span>{a.name}</span>
                          </a>
                        )
                      )}
                      {m.body ? <div className="msg-text">{m.body}</div> : null}
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
            {pendingFiles.length > 0 && (
              <div className="attachment-preview-container" style={{ display: "flex" }}>
                {pendingFiles.map((f) => (
                  <div
                    key={f.id}
                    className={`preview-item ${f.isImage ? "file-image" : "file-generic"}`}
                  >
                    {f.isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.name} />
                    ) : (
                      <i className="fas fa-file-alt" />
                    )}
                    <div
                      className="remove-attachment"
                      onClick={() => removePending(f.id)}
                      role="button"
                    >
                      <i className="fas fa-times" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {emojiOpen && (
              <div
                className="emoji-picker-panel"
                onClick={(e) => e.stopPropagation()}
              >
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="emoji-btn"
                    onClick={() => insertEmoji(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <div className="input-controls">
              <div className="input-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                  onChange={onPickFiles}
                />
                <button
                  type="button"
                  id="attachBtn"
                  title="Attach File"
                  disabled={!activeId || threadBlocked}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-paperclip" />
                </button>
                <button
                  type="button"
                  title="Emoji"
                  disabled={!activeId || threadBlocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmojiOpen((v) => !v);
                  }}
                >
                  <i className="far fa-smile" />
                </button>
              </div>
              <div className="input-wrapper">
                <textarea
                  id="messageInput"
                  ref={textareaRef}
                  placeholder={
                    threadBlocked
                      ? "Unblock to send a message"
                      : activeId
                        ? "Type a message..."
                        : "Select a chat first"
                  }
                  rows={1}
                  value={text}
                  disabled={!activeId || sending || threadBlocked}
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
              <button
                type="button"
                className="send-btn"
                id="sendBtn"
                disabled={
                  !activeId ||
                  sending ||
                  threadBlocked ||
                  (!text.trim() && pendingFiles.length === 0)
                }
                onClick={sendMessage}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </footer>

          <div className="blocked-notice">
            <i className="fas fa-ban" /> You have blocked this user. Unblock to
            send a message.{" "}
            {activeId && (
              <button
                type="button"
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "transparent",
                  color: "#d96464",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => convoAction(activeId, "unblock")}
              >
                Unblock
              </button>
            )}
          </div>
        </section>

        <aside
          className={`detail-sidebar${detailsOpen ? "" : " collapsed"}`}
          id="detailSidebar"
        >
          <div className="detail-content">
            <div className="detail-profile">
              <Image
                src={otherAvatar}
                alt={otherName}
                width={100}
                height={100}
                className="detail-avatar"
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
              <h3>{otherName}</h3>
              <p>{activeId ? (threadBlocked ? "Blocked" : "Member") : "—"}</p>
            </div>
            <div className="detail-stats">
              <div className="stat-card">
                <div className="stat-icon-circle">
                  <i className="fas fa-comments" />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Messages</span>
                  <strong className="stat-value">
                    {activeId ? messages.length : "—"}
                  </strong>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-circle">
                  <i className="fas fa-clock" />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Status</span>
                  <strong className="stat-value">
                    {threadBlocked ? "Blocked" : activeId ? "Active" : "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
          <div className="detail-media">
            <div className="media-header">
              <h4>Shared Media</h4>
            </div>
            <div className="media-grid">
              {messages
                .flatMap((m) => m.attachments || [])
                .filter(
                  (a) =>
                    a.mime?.startsWith("image/") ||
                    a.url?.startsWith("data:image")
                )
                .slice(-6)
                .map((a, i) => (
                  <div className="media-item" key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              {messages.flatMap((m) => m.attachments || []).filter(
                (a) =>
                  a.mime?.startsWith("image/") ||
                  a.url?.startsWith("data:image")
              ).length === 0 && (
                <>
                  <div className="media-item">
                    <i className="fas fa-image" />
                  </div>
                  <div className="media-item">
                    <i className="fas fa-play-circle" />
                  </div>
                  <div className="media-item">
                    <i className="fas fa-file-alt" />
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </main>
      <div id="toast-container" />
    </>
  );
}
