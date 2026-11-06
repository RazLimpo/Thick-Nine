"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-partners.css";

type PartnershipRow = {
  _id: string;
  status: string;
  initiatedBy?: string;
  team: {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    status?: string;
    leader?: {
      _id?: string;
      name?: string;
      avatar?: string;
    } | null;
  } | null;
};

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export default function FreelancerPartnersClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rows, setRows] = useState<PartnershipRow[]>([]);
  const [requestTeamId, setRequestTeamId] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/affiliate/teams/me/partnerships", {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load partnerships.");
      }
      setRows(Array.isArray(data.partnerships) ? data.partnerships : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!token || !loggedIn) {
      router.replace("/?auth=login");
      return;
    }
    load();
  }, [router, load]);

  const respond = async (teamId: string, partnershipId: string, action: "accept" | "decline") => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${teamId}/partnerships/${partnershipId}/respond`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Action failed.");
      showToast(action === "accept" ? "Partnership active." : "Declined.");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (
    teamId: string,
    partnershipId: string,
    status: "paused" | "active" | "ended"
  ) => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${teamId}/partnerships/${partnershipId}`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Update failed.");
      showToast(
        status === "paused"
          ? "Partnership paused."
          : status === "ended"
            ? "Partnership ended."
            : "Partnership resumed."
      );
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const requestJoin = async () => {
    const teamId = requestTeamId.trim();
    if (!teamId) {
      showToast("Enter a group id.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${teamId}/partnerships/request`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: "{}",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Request failed.");
      showToast("Request sent to the group leader.");
      setRequestTeamId("");
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const pending = rows.filter((r) =>
    ["pending_invite", "pending_request"].includes(r.status)
  );
  const active = rows.filter((r) => ["active", "paused"].includes(r.status));

  return (
    <div className="fp-page">
      <div className="fp-wrap">
        <div className="fp-header">
          <div>
            <h1>Marketing partners</h1>
            <p>
              Affiliate Groups (created by affiliates) can promote your services.
              Accept invites, pause when overbooked, or request to join a group by
              id. Freelancers cannot create groups.
            </p>
          </div>
          <div className="fp-actions">
            <Link href="/freelancer-settings" className="fp-btn fp-btn-ghost">
              <i className="fas fa-cog" /> Settings
            </Link>
            <Link href="/affiliate-teams" className="fp-btn fp-btn-ghost">
              <i className="fas fa-search" /> My group invites
            </Link>
          </div>
        </div>

        {error ? <div className="fp-error">{error}</div> : null}

        <div className="fp-card">
          <h2>Request to join a group</h2>
          <p className="fp-sub">
            Paste the Affiliate Group id (from the leader or a public listing).
            The leader must accept.
          </p>
          <div className="fp-row">
            <input
              type="text"
              value={requestTeamId}
              onChange={(e) => setRequestTeamId(e.target.value)}
              placeholder="Group id"
              aria-label="Group id"
            />
            <button
              type="button"
              className="fp-btn fp-btn-primary fp-btn-sm"
              disabled={busy}
              onClick={requestJoin}
            >
              Send request
            </button>
          </div>
        </div>

        <div className="fp-card">
          <h2>Pending</h2>
          <p className="fp-sub">Invites from groups and your open requests.</p>
          {loading ? (
            <div className="fp-empty">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="fp-empty">No pending partnerships.</div>
          ) : (
            pending.map((row) => {
              const teamId = row.team?._id || "";
              return (
                <div className="fp-item" key={row._id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="fp-avatar"
                    src={row.team?.leader?.avatar || "/default-avatar.png"}
                    alt=""
                  />
                  <div className="fp-meta">
                    <strong>
                      {row.team?.name || "Group"}
                      <span
                        className={`fp-badge ${
                          row.status.includes("pending") ? "pending" : ""
                        }`}
                      >
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </strong>
                    <span>
                      Leader: {row.team?.leader?.name || "—"}
                      {row.initiatedBy ? ` · via ${row.initiatedBy}` : ""}
                    </span>
                  </div>
                  {row.status === "pending_invite" && teamId ? (
                    <div className="fp-item-actions">
                      <button
                        type="button"
                        className="fp-btn fp-btn-primary fp-btn-sm"
                        disabled={busy}
                        onClick={() => respond(teamId, row._id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="fp-btn fp-btn-ghost fp-btn-sm"
                        disabled={busy}
                        onClick={() => respond(teamId, row._id, "decline")}
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="fp-badge pending">Awaiting leader</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="fp-card">
          <h2>Active &amp; paused</h2>
          <p className="fp-sub">
            Pause if you are overbooked. End removes the partnership.
          </p>
          {loading ? (
            <div className="fp-empty">Loading…</div>
          ) : active.length === 0 ? (
            <div className="fp-empty">No active partners yet.</div>
          ) : (
            active.map((row) => {
              const teamId = row.team?._id || "";
              return (
                <div className="fp-item" key={row._id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="fp-avatar"
                    src={row.team?.leader?.avatar || "/default-avatar.png"}
                    alt=""
                  />
                  <div className="fp-meta">
                    <strong>
                      {row.team?.name || "Group"}
                      <span
                        className={`fp-badge ${
                          row.status === "active"
                            ? "active"
                            : row.status === "paused"
                              ? "paused"
                              : ""
                        }`}
                      >
                        {row.status}
                      </span>
                    </strong>
                    <span>
                      {row.team?.description ||
                        `Leader: ${row.team?.leader?.name || "—"}`}
                    </span>
                  </div>
                  {teamId ? (
                    <div className="fp-item-actions">
                      {row.status === "active" ? (
                        <button
                          type="button"
                          className="fp-btn fp-btn-ghost fp-btn-sm"
                          disabled={busy}
                          onClick={() => setStatus(teamId, row._id, "paused")}
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="fp-btn fp-btn-primary fp-btn-sm"
                          disabled={busy}
                          onClick={() => setStatus(teamId, row._id, "active")}
                        >
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        className="fp-btn fp-btn-ghost fp-btn-sm"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("End this partnership?")) {
                            setStatus(teamId, row._id, "ended");
                          }
                        }}
                      >
                        End
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {toast ? <div className="fp-toast">{toast}</div> : null}
    </div>
  );
}
