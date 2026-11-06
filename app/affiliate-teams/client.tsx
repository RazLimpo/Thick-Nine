"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import "@/styles/pages/affiliate-teams.css";

type MembershipStatus =
  | "active"
  | "pending_invite"
  | "pending_request"
  | "declined"
  | "left"
  | "removed";

type TeamListItem = {
  membershipId: string;
  membershipStatus: MembershipStatus;
  role: string;
  team: {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    visibility?: string;
    status?: string;
    leaderId?: string;
    leaderName?: string;
    leaderAvatar?: string;
    conversationId?: string | null;
    createdAt?: string;
  };
};

type TeamDetail = {
  team: {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    visibility?: string;
    status?: string;
    conversationId?: string | null;
    leader?: { _id: string; name: string; avatar?: string } | null;
    createdAt?: string;
  };
  myMembership: { _id: string; role: string; status: string } | null;
  members: Array<{
    membershipId: string;
    role: string;
    user: { _id: string; name: string; avatar?: string; role?: string } | null;
  }>;
  partnerships: Array<{
    _id: string;
    status: string;
    initiatedBy?: string;
    freelancer: {
      _id: string;
      name: string;
      avatar?: string;
      averageRating?: number;
    } | null;
  }>;
  pendingMembers: Array<{
    membershipId: string;
    status: string;
    user: { _id: string; name: string; email?: string; avatar?: string } | null;
  }>;
  pendingPartnerships: Array<{
    _id: string;
    status: string;
    initiatedBy?: string;
    freelancer: { _id: string; name: string; avatar?: string } | null;
  }>;
};

function authHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export default function AffiliateTeamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamFromUrl = searchParams.get("team") || "";

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(teamFromUrl);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [panel, setPanel] = useState<"members" | "partners" | "pending" | "tracking">("members");

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createVis, setCreateVis] = useState<"private" | "public">("private");
  const [creating, setCreating] = useState(false);
  const [canCreateGroup, setCanCreateGroup] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFreelancerId, setInviteFreelancerId] = useState("");
  const [busy, setBusy] = useState(false);

  // Tracking links (Step 6)
  const [trackingLinks, setTrackingLinks] = useState<
    Array<{
      _id: string;
      code: string;
      name?: string;
      status: string;
      clicks?: number;
      uniqueClicks?: number;
      serviceId?: string | null;
      freelancerId?: string;
      partnershipId?: string;
      publicUrl?: string;
      destinationPreview?: string;
    }>
  >([]);
  const [trackPartnershipId, setTrackPartnershipId] = useState("");
  const [trackServiceId, setTrackServiceId] = useState("");
  const [trackName, setTrackName] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const loadTeams = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/affiliate/teams", {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load groups.");
      }
      const list: TeamListItem[] = Array.isArray(data.teams) ? data.teams : [];
      setTeams(list);
      if (!selectedId && list.length > 0) {
        const firstActive =
          list.find((t) => t.membershipStatus === "active") || list[0];
        setSelectedId(firstActive.team._id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetail = useCallback(async (teamId: string) => {
    if (!teamId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/affiliate/teams/${teamId}`, {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load group.");
      }
      setDetail(data as TeamDetail);
    } catch (e: unknown) {
      setDetail(null);
      showToast(e instanceof Error ? e.message : "Could not load group.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!token || !loggedIn) {
      router.replace("/?auth=login");
      return;
    }
    // Group creation is affiliate-only (admins allowed)
    const role = String(
      localStorage.getItem("userRole") ||
        localStorage.getItem("role") ||
        ""
    ).toLowerCase();
    setCanCreateGroup(
      role === "affiliate" ||
        role === "admin" ||
        role.includes("affiliate")
    );
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (teamFromUrl) setSelectedId(teamFromUrl);
  }, [teamFromUrl]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateGroup) {
      showToast("Only affiliate accounts can create groups.");
      return;
    }
    if (createName.trim().length < 3) {
      showToast("Name must be at least 3 characters.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/affiliate/teams", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim(),
          visibility: createVis,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Create failed.");
      showToast("Group created.");
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      setCreating(false);
      setLoading(true);
      await loadTeams();
      if (data.team?._id) setSelectedId(data.team._id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  const respondMembership = async (
    membershipId: string,
    action: "accept" | "decline"
  ) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/members/${membershipId}/respond`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Action failed.");
      showToast(action === "accept" ? "Joined group." : "Declined.");
      await loadTeams();
      await loadDetail(selectedId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const inviteMember = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/members/invite`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: inviteEmail.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Invite failed.");
      showToast("Invite sent.");
      setInviteEmail("");
      await loadDetail(selectedId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setBusy(false);
    }
  };

  const inviteFreelancer = async () => {
    if (!selectedId || !inviteFreelancerId.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/partnerships/invite`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ freelancerId: inviteFreelancerId.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Invite failed.");
      showToast("Partnership invite sent.");
      setInviteFreelancerId("");
      await loadDetail(selectedId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setBusy(false);
    }
  };

  const respondPartnership = async (
    partnershipId: string,
    action: "accept" | "decline"
  ) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/partnerships/${partnershipId}/respond`,
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
      await loadDetail(selectedId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadTrackingLinks = async (teamId: string) => {
    setLoadingLinks(true);
    try {
      const res = await fetch(`/api/affiliate/teams/${teamId}/tracking-links`, {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not load links.");
      setTrackingLinks(Array.isArray(data.links) ? data.links : []);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Could not load links.");
      setTrackingLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const createTrackingLink = async () => {
    if (!selectedId || !trackPartnershipId.trim()) {
      showToast("Select an active partnership.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/affiliate/teams/${selectedId}/tracking-links`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partnershipId: trackPartnershipId.trim(),
          serviceId: trackServiceId.trim() || undefined,
          name: trackName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not create link.");
      showToast("Tracking link created.");
      setTrackServiceId("");
      setTrackName("");
      await loadTrackingLinks(selectedId);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Could not create link.");
    } finally {
      setBusy(false);
    }
  };

  const patchTrackingLink = async (linkId: string, status: "active" | "paused") => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/tracking-links/${linkId}`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Update failed.");
      showToast(status === "paused" ? "Link paused." : "Link active.");
      await loadTrackingLinks(selectedId);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied.");
    } catch {
      showToast("Could not copy.");
    }
  };

  const leaveGroup = async () => {
    if (!selectedId) return;
    if (!window.confirm("Leave this group?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/affiliate/teams/${selectedId}/members/leave`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          credentials: "include",
          body: "{}",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not leave.");
      showToast("You left the group.");
      setSelectedId("");
      setDetail(null);
      await loadTeams();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Could not leave.");
    } finally {
      setBusy(false);
    }
  };

  const isLeader = detail?.myMembership?.role === "leader";
  const isActiveMember = detail?.myMembership?.status === "active";

  useEffect(() => {
    if (selectedId && panel === "tracking" && detail?.myMembership?.status === "active") {
      loadTrackingLinks(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, panel, detail?.myMembership?.status]);
  const myPendingInvite = teams.find(
    (t) =>
      t.team._id === selectedId && t.membershipStatus === "pending_invite"
  );

  return (
    <div className="agt-page">
      <div className="agt-wrap">
        <div className="agt-top">
          <div>
            <h1>Affiliate Groups</h1>
            <p>
              Promotion teams are separate from your Referral Network. Affiliates
              who meet growth goals can create groups; freelancers join as
              marketing partners. Members use tracking links and group chat when
              active.
            </p>
          </div>
          <div className="agt-actions">
            <Link href="/affiliate-dashboard?tab=referrals" className="agt-btn agt-btn-ghost">
              <i className="fas fa-sitemap" /> Referral Network
            </Link>
            {canCreateGroup ? (
              <button
                type="button"
                className="agt-btn agt-btn-primary"
                onClick={() => setShowCreate((v) => !v)}
              >
                <i className="fas fa-plus" /> Create group
              </button>
            ) : (
              <span className="agt-muted">
                Group creation is for active affiliates who meet growth goals.
              </span>
            )}
          </div>
        </div>

        {error && <div className="agt-error">{error}</div>}

        {showCreate && canCreateGroup && (
          <div className="agt-card">
            <h3 className="agt-section-title">New group</h3>
            <form className="agt-form" onSubmit={createTeam}>
              <div>
                <label htmlFor="agt-name">Name</label>
                <input
                  id="agt-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Design Growth Squad"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label htmlFor="agt-desc">Description</label>
                <textarea
                  id="agt-desc"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="What this group promotes…"
                />
              </div>
              <div>
                <label htmlFor="agt-vis">Visibility</label>
                <select
                  id="agt-vis"
                  value={createVis}
                  onChange={(e) =>
                    setCreateVis(e.target.value as "private" | "public")
                  }
                >
                  <option value="private">Private (invite only)</option>
                  <option value="public">Public (discoverable)</option>
                </select>
              </div>
              <div className="agt-row">
                <button
                  type="button"
                  className="agt-btn agt-btn-ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="agt-btn agt-btn-primary"
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="agt-grid">
          {/* Left: list */}
          <div className="agt-card">
            <h3 className="agt-section-title">Your groups</h3>
            {loading ? (
              <div className="agt-empty">Loading…</div>
            ) : teams.length === 0 ? (
              <div className="agt-empty">
                No groups yet. Create one to invite affiliates and freelancers.
              </div>
            ) : (
              <div className="agt-list">
                {teams.map((row) => (
                  <button
                    key={row.membershipId}
                    type="button"
                    className={`agt-item${
                      selectedId === row.team._id ? " is-active" : ""
                    }`}
                    onClick={() => setSelectedId(row.team._id)}
                  >
                    <div>
                      <strong>{row.team.name}</strong>
                      <span>
                        {row.role === "leader" ? "Leader" : "Member"} ·{" "}
                        {row.team.leaderName || "—"}
                      </span>
                    </div>
                    <span
                      className={`agt-badge ${
                        row.membershipStatus === "active"
                          ? "active"
                          : row.membershipStatus.startsWith("pending")
                          ? "pending"
                          : ""
                      }`}
                    >
                      {row.membershipStatus.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: detail */}
          <div className="agt-card">
            {!selectedId ? (
              <div className="agt-empty">Select a group to manage it.</div>
            ) : detailLoading || !detail ? (
              <div className="agt-empty">
                {detailLoading ? "Loading group…" : "Group unavailable."}
              </div>
            ) : (
              <>
                <div className="agt-section-title">
                  <span>
                    {detail.team.name}{" "}
                    {isLeader && <span className="agt-badge leader">Leader</span>}
                  </span>
                  <span className="agt-muted">
                    {detail.team.visibility || "private"}
                  </span>
                </div>
                {detail.team.description ? (
                  <p className="agt-muted" style={{ marginTop: 0 }}>
                    {detail.team.description}
                  </p>
                ) : null}

                {myPendingInvite && (
                  <div className="agt-row" style={{ marginBottom: 12 }}>
                    <span className="agt-muted">You were invited to this group.</span>
                    <button
                      type="button"
                      className="agt-btn agt-btn-primary agt-btn-sm"
                      disabled={busy}
                      onClick={() =>
                        respondMembership(myPendingInvite.membershipId, "accept")
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="agt-btn agt-btn-ghost agt-btn-sm"
                      disabled={busy}
                      onClick={() =>
                        respondMembership(myPendingInvite.membershipId, "decline")
                      }
                    >
                      Decline
                    </button>
                  </div>
                )}

                {isActiveMember && detail.team.conversationId && (
                  <p style={{ marginTop: 0 }}>
                    <Link
                      href={`/messages?c=${detail.team.conversationId}`}
                      className="agt-linkish"
                    >
                      <i className="fas fa-comments" /> Open group chat
                    </Link>
                  </p>
                )}

                <div className="agt-tabs">
                  <button
                    type="button"
                    className={`agt-tab${panel === "members" ? " is-on" : ""}`}
                    onClick={() => setPanel("members")}
                  >
                    Members ({detail.members.length})
                  </button>
                  <button
                    type="button"
                    className={`agt-tab${panel === "partners" ? " is-on" : ""}`}
                    onClick={() => setPanel("partners")}
                  >
                    Freelancer partners
                  </button>
                  {isActiveMember && (
                    <button
                      type="button"
                      className={`agt-tab${panel === "tracking" ? " is-on" : ""}`}
                      onClick={() => setPanel("tracking")}
                    >
                      Tracking links
                    </button>
                  )}
                  {isLeader && (
                    <button
                      type="button"
                      className={`agt-tab${panel === "pending" ? " is-on" : ""}`}
                      onClick={() => setPanel("pending")}
                    >
                      Pending
                    </button>
                  )}
                </div>

                {panel === "members" && (
                  <>
                    {isLeader && (
                      <div className="agt-row" style={{ marginBottom: 12 }}>
                        <input
                          type="email"
                          placeholder="Invite by email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                        <button
                          type="button"
                          className="agt-btn agt-btn-primary agt-btn-sm"
                          disabled={busy || !inviteEmail.trim()}
                          onClick={inviteMember}
                        >
                          Invite
                        </button>
                      </div>
                    )}
                    {detail.members.length === 0 ? (
                      <div className="agt-empty">No active members yet.</div>
                    ) : (
                      detail.members.map((m) => (
                        <div className="agt-member" key={m.membershipId}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="agt-avatar"
                            src={m.user?.avatar || "/default-avatar.png"}
                            alt=""
                          />
                          <div className="agt-member-meta">
                            <strong>{m.user?.name || "Member"}</strong>
                            <span>
                              {m.role}
                              {m.user?.role ? ` · ${m.user.role}` : ""}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    {isActiveMember && !isLeader && (
                      <button
                        type="button"
                        className="agt-btn agt-btn-ghost agt-btn-sm"
                        style={{ marginTop: 12 }}
                        disabled={busy}
                        onClick={leaveGroup}
                      >
                        Leave group
                      </button>
                    )}
                  </>
                )}

                {panel === "partners" && (
                  <>
                    {isLeader && (
                      <div className="agt-row" style={{ marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Freelancer user id"
                          value={inviteFreelancerId}
                          onChange={(e) => setInviteFreelancerId(e.target.value)}
                        />
                        <button
                          type="button"
                          className="agt-btn agt-btn-primary agt-btn-sm"
                          disabled={busy || !inviteFreelancerId.trim()}
                          onClick={inviteFreelancer}
                        >
                          Invite partner
                        </button>
                      </div>
                    )}
                    <p className="agt-muted" style={{ marginTop: 0 }}>
                      After a partnership is active, open the Tracking links tab
                      to create shareable promo URLs for that freelancer.
                    </p>
                    {detail.partnerships.filter((p) =>
                      ["active", "paused"].includes(p.status)
                    ).length === 0 ? (
                      <div className="agt-empty">No active partners yet.</div>
                    ) : (
                      detail.partnerships
                        .filter((p) => ["active", "paused"].includes(p.status))
                        .map((p) => (
                          <div className="agt-member" key={p._id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              className="agt-avatar"
                              src={p.freelancer?.avatar || "/default-avatar.png"}
                              alt=""
                            />
                            <div className="agt-member-meta">
                              <strong>{p.freelancer?.name || "Freelancer"}</strong>
                              <span>{p.status}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </>
                )}


                {panel === "tracking" && isActiveMember && (
                  <>
                    <p className="agt-muted" style={{ marginTop: 0 }}>
                      Share these links when promoting a partnered freelancer.
                      Clicks are counted; order commissions come later.
                    </p>
                    <div className="agt-form" style={{ marginBottom: 16 }}>
                      <label htmlFor="agt-track-partnership">Active partnership</label>
                      <select
                        id="agt-track-partnership"
                        value={trackPartnershipId}
                        onChange={(e) => setTrackPartnershipId(e.target.value)}
                      >
                        <option value="">Select partner…</option>
                        {(detail.partnerships || [])
                          .filter((p) => p.status === "active")
                          .map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.freelancer?.name || p._id}
                            </option>
                          ))}
                      </select>
                      <label htmlFor="agt-track-service">Service id (optional)</label>
                      <input
                        id="agt-track-service"
                        type="text"
                        value={trackServiceId}
                        onChange={(e) => setTrackServiceId(e.target.value)}
                        placeholder="Leave empty for profile page"
                      />
                      <label htmlFor="agt-track-name">Label (optional)</label>
                      <input
                        id="agt-track-name"
                        type="text"
                        value={trackName}
                        onChange={(e) => setTrackName(e.target.value)}
                        placeholder="e.g. IG story — logo pack"
                      />
                      <button
                        type="button"
                        className="agt-btn agt-btn-primary agt-btn-sm"
                        disabled={busy || !trackPartnershipId}
                        onClick={createTrackingLink}
                      >
                        Create link
                      </button>
                    </div>

                    {loadingLinks ? (
                      <div className="agt-empty">Loading links…</div>
                    ) : trackingLinks.length === 0 ? (
                      <div className="agt-empty">No tracking links yet.</div>
                    ) : (
                      trackingLinks.map((l) => (
                        <div className="agt-member" key={l._id}>
                          <div className="agt-member-meta">
                            <strong>
                              {l.name || l.code}{" "}
                              <span
                                className={`agt-badge ${
                                  l.status === "active" ? "active" : "pending"
                                }`}
                              >
                                {l.status}
                              </span>
                            </strong>
                            <span>
                              {l.clicks ?? 0} clicks · {l.uniqueClicks ?? 0} unique
                              {l.serviceId ? " · service" : " · profile"}
                            </span>
                            <span className="agt-muted">{l.publicUrl}</span>
                          </div>
                          <div className="agt-row">
                            <button
                              type="button"
                              className="agt-btn agt-btn-primary agt-btn-sm"
                              onClick={() => l.publicUrl && copyLink(l.publicUrl)}
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              className="agt-btn agt-btn-ghost agt-btn-sm"
                              disabled={busy}
                              onClick={() =>
                                patchTrackingLink(
                                  l._id,
                                  l.status === "active" ? "paused" : "active"
                                )
                              }
                            >
                              {l.status === "active" ? "Pause" : "Resume"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {panel === "pending" && isLeader && (
                  <>
                    <h4 className="agt-muted">Member requests / invites</h4>
                    {detail.pendingMembers.length === 0 ? (
                      <div className="agt-empty">No pending members.</div>
                    ) : (
                      detail.pendingMembers.map((m) => (
                        <div className="agt-member" key={m.membershipId}>
                          <div className="agt-member-meta">
                            <strong>{m.user?.name || "User"}</strong>
                            <span>
                              {m.status}
                              {m.user?.email ? ` · ${m.user.email}` : ""}
                            </span>
                          </div>
                          {m.status === "pending_request" && (
                            <div className="agt-row">
                              <button
                                type="button"
                                className="agt-btn agt-btn-primary agt-btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  respondMembership(m.membershipId, "accept")
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="agt-btn agt-btn-ghost agt-btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  respondMembership(m.membershipId, "decline")
                                }
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    <h4 className="agt-muted" style={{ marginTop: 16 }}>
                      Partnership requests
                    </h4>
                    {detail.pendingPartnerships.length === 0 ? (
                      <div className="agt-empty">No pending partnerships.</div>
                    ) : (
                      detail.pendingPartnerships.map((p) => (
                        <div className="agt-member" key={p._id}>
                          <div className="agt-member-meta">
                            <strong>{p.freelancer?.name || "Freelancer"}</strong>
                            <span>
                              {p.status} · {p.initiatedBy || "—"}
                            </span>
                          </div>
                          {p.status === "pending_request" && (
                            <div className="agt-row">
                              <button
                                type="button"
                                className="agt-btn agt-btn-primary agt-btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  respondPartnership(p._id, "accept")
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="agt-btn agt-btn-ghost agt-btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  respondPartnership(p._id, "decline")
                                }
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="agt-toast">{toast}</div>}
    </div>
  );
}
