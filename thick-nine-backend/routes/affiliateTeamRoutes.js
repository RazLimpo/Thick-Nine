/**
 * routes/affiliateTeamRoutes.js
 * Affiliate Groups (promotion teams) — separate from Referral Network
 *
 * Mount:
 *   app.use("/api/affiliate/teams", require("./routes/affiliateTeamRoutes"));
 *
 * Auth: middleware/auth → req.user.id | req.user._id
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

const User = require("../models/User");
const AffiliateTeam = require("../models/AffiliateTeam");
const AffiliateTeamMembership = require("../models/AffiliateTeamMembership");
const FreelancerTeamPartnership = require("../models/FreelancerTeamPartnership");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");

const MAX_FREELANCER_ACTIVE_PARTNERSHIPS = 3;

function uid(req) {
  return req.user?.id || req.user?._id;
}

function isOid(id) {
  return id && mongoose.Types.ObjectId.isValid(String(id));
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function notify(userId, title, message, link) {
  try {
    if (!userId) return;
    await Notification.create({
      userId,
      type: "general",
      title: String(title).slice(0, 120),
      message: String(message || "").slice(0, 500),
      link: String(link || "/affiliate-teams").slice(0, 300),
    });
  } catch (e) {
    console.error("team notify:", e.message);
  }
}

async function getActiveMembership(teamId, userId) {
  return AffiliateTeamMembership.findOne({
    teamId,
    userId,
    status: "active",
  }).lean();
}

async function assertLeader(teamId, userId) {
  const team = await AffiliateTeam.findById(teamId);
  if (!team || team.status === "archived") {
    return { error: { status: 404, message: "Group not found." } };
  }
  if (String(team.leaderId) !== String(userId)) {
    return { error: { status: 403, message: "Only the group leader can do this." } };
  }
  return { team };
}

async function assertActiveMember(teamId, userId) {
  const m = await getActiveMembership(teamId, userId);
  if (!m) {
    return { error: { status: 403, message: "You are not an active member of this group." } };
  }
  return { membership: m };
}

async function syncGroupConversationParticipants(team) {
  if (!team?.conversationId) return;
  const active = await AffiliateTeamMembership.find({
    teamId: team._id,
    status: "active",
  })
    .select("userId")
    .lean();
  const ids = active.map((m) => m.userId);
  // Always include leader
  if (!ids.some((id) => String(id) === String(team.leaderId))) {
    ids.push(team.leaderId);
  }
  await Conversation.updateOne(
    { _id: team.conversationId },
    { $set: { participants: ids, type: "affiliate_team", teamId: team._id } }
  );
}

/* ===========================================================
   LIST + CREATE
   =========================================================== */

/**
 * GET /api/affiliate/teams
 * ?role=leader|member|all  — default all teams where user is active member
 * ?pending=1 — also return pending invites/requests for me
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const memberships = await AffiliateTeamMembership.find({
      userId,
      status: { $in: ["active", "pending_invite", "pending_request"] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const teamIds = memberships.map((m) => m.teamId);
    const teams = await AffiliateTeam.find({
      _id: { $in: teamIds },
      status: { $ne: "archived" },
    }).lean();

    const byId = Object.fromEntries(teams.map((t) => [String(t._id), t]));

    const leaders = await User.find({
      _id: { $in: teams.map((t) => t.leaderId) },
    })
      .select("fullName displayName avatar")
      .lean();
    const leaderMap = Object.fromEntries(
      leaders.map((u) => [String(u._id), u])
    );

    const list = memberships
      .map((m) => {
        const t = byId[String(m.teamId)];
        if (!t) return null;
        const leader = leaderMap[String(t.leaderId)];
        return {
          membershipId: m._id,
          membershipStatus: m.status,
          role: m.role,
          team: {
            _id: t._id,
            name: t.name,
            slug: t.slug,
            description: t.description,
            visibility: t.visibility,
            status: t.status,
            leaderId: t.leaderId,
            leaderName:
              leader?.displayName || leader?.fullName || "Leader",
            leaderAvatar: leader?.avatar || "/default-avatar.png",
            conversationId: t.conversationId,
            createdAt: t.createdAt,
          },
        };
      })
      .filter(Boolean);

    return res.json({ success: true, teams: list });
  } catch (e) {
    console.error("GET /affiliate/teams:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list groups." });
  }
});

/**
 * POST /api/affiliate/teams
 * body: { name, description?, visibility?: "public"|"private" }
 * Creates team + leader membership + group Conversation
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const name = String(req.body?.name || "").trim();
    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Group name must be at least 3 characters.",
      });
    }

    const visibility =
      req.body?.visibility === "public" ? "public" : "private";
    const description = String(req.body?.description || "")
      .trim()
      .slice(0, 500);
    let slug = slugify(name) || `group-${String(userId).slice(-6)}`;

    // Unique-ish slug
    const exists = await AffiliateTeam.findOne({ slug }).lean();
    if (exists) {
      slug = `${slug}-${String(Date.now()).slice(-5)}`;
    }

    const team = await AffiliateTeam.create({
      name: name.slice(0, 80),
      slug,
      description,
      leaderId: userId,
      visibility,
      status: "active",
    });

    await AffiliateTeamMembership.create({
      teamId: team._id,
      userId,
      role: "leader",
      status: "active",
      invitedBy: userId,
      respondedAt: new Date(),
    });

    // Group chat room (members synced on membership changes)
    const conversation = await Conversation.create({
      type: "affiliate_team",
      teamId: team._id,
      participants: [userId],
      lastMessage: "Group created",
      lastMessageAt: new Date(),
      lastSenderId: userId,
    });

    team.conversationId = conversation._id;
    await team.save();

    return res.status(201).json({
      success: true,
      message: "Affiliate group created.",
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        visibility: team.visibility,
        status: team.status,
        leaderId: team.leaderId,
        conversationId: team.conversationId,
      },
    });
  } catch (e) {
    console.error("POST /affiliate/teams:", e);
    return res
      .status(500)
      .json({ success: false, message: e.message || "Failed to create group." });
  }
});

/**
 * GET /api/affiliate/teams/discover
 * Public groups (name search) — for freelancers / affiliates browsing
 */
router.get("/discover", auth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = { visibility: "public", status: "active" };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    const teams = await AffiliateTeam.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("leaderId", "fullName displayName avatar")
      .lean();

    return res.json({
      success: true,
      teams: teams.map((t) => ({
        _id: t._id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        leader: t.leaderId
          ? {
              _id: t.leaderId._id,
              name: t.leaderId.displayName || t.leaderId.fullName,
              avatar: t.leaderId.avatar,
            }
          : null,
      })),
    });
  } catch (e) {
    console.error("GET discover:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to discover groups." });
  }
});

/**
 * GET /api/affiliate/teams/me/partnerships
 * Freelancer view of partnership invites + active rows
 */
router.get("/me/partnerships", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const rows = await FreelancerTeamPartnership.find({
      freelancerId: userId,
      status: {
        $in: [
          "pending_invite",
          "pending_request",
          "active",
          "paused",
        ],
      },
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "teamId",
        select: "name slug description leaderId status conversationId",
        populate: { path: "leaderId", select: "fullName displayName avatar" },
      })
      .lean();

    return res.json({
      success: true,
      partnerships: rows.map((p) => ({
        _id: p._id,
        status: p.status,
        initiatedBy: p.initiatedBy,
        team: p.teamId
          ? {
              _id: p.teamId._id,
              name: p.teamId.name,
              slug: p.teamId.slug,
              description: p.teamId.description,
              status: p.teamId.status,
              leader: p.teamId.leaderId
                ? {
                    _id: p.teamId.leaderId._id,
                    name:
                      p.teamId.leaderId.displayName ||
                      p.teamId.leaderId.fullName,
                    avatar: p.teamId.leaderId.avatar,
                  }
                : null,
            }
          : null,
      })),
    });
  } catch (e) {
    console.error("GET me/partnerships:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load partnerships." });
  }
});

/**
 * GET /api/affiliate/teams/:teamId
 */
router.get("/:teamId", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const team = await AffiliateTeam.findById(teamId)
      .populate("leaderId", "fullName displayName avatar email")
      .lean();
    if (!team || team.status === "archived") {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const myMembership = await AffiliateTeamMembership.findOne({
      teamId,
      userId,
    }).lean();

    const isMember = myMembership?.status === "active";
    const isLeader = String(team.leaderId?._id || team.leaderId) === String(userId);

    // Non-members only see public groups
    if (!isMember && !isLeader && team.visibility !== "public") {
      return res.status(403).json({
        success: false,
        message: "This group is private.",
      });
    }

    const [members, partnerships] = await Promise.all([
      AffiliateTeamMembership.find({ teamId, status: "active" })
        .populate("userId", "fullName displayName avatar role")
        .lean(),
      FreelancerTeamPartnership.find({
        teamId,
        status: { $in: ["active", "paused", "pending_invite", "pending_request"] },
      })
        .populate("freelancerId", "fullName displayName avatar averageRating")
        .lean(),
    ]);

    // Pending queues only for leader
    let pendingMembers = [];
    let pendingPartnerships = [];
    if (isLeader) {
      pendingMembers = await AffiliateTeamMembership.find({
        teamId,
        status: { $in: ["pending_invite", "pending_request"] },
      })
        .populate("userId", "fullName displayName avatar email")
        .lean();
      pendingPartnerships = partnerships.filter((p) =>
        ["pending_invite", "pending_request"].includes(p.status)
      );
    }

    return res.json({
      success: true,
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        visibility: team.visibility,
        status: team.status,
        conversationId: team.conversationId,
        leader: team.leaderId
          ? {
              _id: team.leaderId._id || team.leaderId,
              name:
                team.leaderId.displayName ||
                team.leaderId.fullName ||
                "Leader",
              avatar: team.leaderId.avatar || "/default-avatar.png",
            }
          : null,
        createdAt: team.createdAt,
      },
      myMembership: myMembership
        ? {
            _id: myMembership._id,
            role: myMembership.role,
            status: myMembership.status,
          }
        : null,
      members: members.map((m) => ({
        membershipId: m._id,
        role: m.role,
        user: m.userId
          ? {
              _id: m.userId._id,
              name: m.userId.displayName || m.userId.fullName,
              avatar: m.userId.avatar || "/default-avatar.png",
              role: m.userId.role,
            }
          : null,
      })),
      partnerships: partnerships
        .filter((p) => p.status === "active" || p.status === "paused" || isLeader)
        .map((p) => ({
          _id: p._id,
          status: p.status,
          initiatedBy: p.initiatedBy,
          freelancer: p.freelancerId
            ? {
                _id: p.freelancerId._id,
                name:
                  p.freelancerId.displayName ||
                  p.freelancerId.fullName,
                avatar: p.freelancerId.avatar || "/default-avatar.png",
                averageRating: p.freelancerId.averageRating,
              }
            : null,
        })),
      pendingMembers: isLeader
        ? pendingMembers.map((m) => ({
            membershipId: m._id,
            status: m.status,
            user: m.userId
              ? {
                  _id: m.userId._id,
                  name: m.userId.displayName || m.userId.fullName,
                  email: m.userId.email,
                  avatar: m.userId.avatar,
                }
              : null,
          }))
        : [],
      pendingPartnerships: isLeader
        ? pendingPartnerships.map((p) => ({
            _id: p._id,
            status: p.status,
            initiatedBy: p.initiatedBy,
            freelancer: p.freelancerId
              ? {
                  _id: p.freelancerId._id,
                  name:
                    p.freelancerId.displayName ||
                    p.freelancerId.fullName,
                  avatar: p.freelancerId.avatar,
                }
              : null,
          }))
        : [],
    });
  } catch (e) {
    console.error("GET team:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load group." });
  }
});

/**
 * PATCH /api/affiliate/teams/:teamId
 * Leader only — name, description, visibility, status (active|paused)
 */
router.patch("/:teamId", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const gate = await assertLeader(teamId, userId);
    if (gate.error) {
      return res.status(gate.error.status).json({ success: false, message: gate.error.message });
    }
    const { team } = gate;

    if (req.body?.name != null) {
      const name = String(req.body.name).trim();
      if (name.length >= 3) team.name = name.slice(0, 80);
    }
    if (req.body?.description != null) {
      team.description = String(req.body.description).trim().slice(0, 500);
    }
    if (req.body?.visibility === "public" || req.body?.visibility === "private") {
      team.visibility = req.body.visibility;
    }
    if (req.body?.status === "active" || req.body?.status === "paused") {
      team.status = req.body.status;
    }

    await team.save();
    return res.json({
      success: true,
      message: "Group updated.",
      team: {
        _id: team._id,
        name: team.name,
        description: team.description,
        visibility: team.visibility,
        status: team.status,
      },
    });
  } catch (e) {
    console.error("PATCH team:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update group." });
  }
});

/* ===========================================================
   MEMBERSHIP
   =========================================================== */

/**
 * POST /api/affiliate/teams/:teamId/members/invite
 * Leader: body { userId } or { email }
 */
router.post("/:teamId/members/invite", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const gate = await assertLeader(teamId, userId);
    if (gate.error) {
      return res.status(gate.error.status).json({ success: false, message: gate.error.message });
    }
    const { team } = gate;

    let targetId = req.body?.userId;
    if (!targetId && req.body?.email) {
      const u = await User.findOne({
        email: String(req.body.email).toLowerCase().trim(),
      }).select("_id");
      targetId = u?._id;
    }
    if (!isOid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Provide userId or email of an existing user.",
      });
    }
    if (String(targetId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are already the leader.",
      });
    }

    const activeCount = await AffiliateTeamMembership.countDocuments({
      teamId,
      status: "active",
    });
    if (activeCount >= (team.maxMembers || 25)) {
      return res.status(400).json({
        success: false,
        message: "This group has reached its member limit.",
      });
    }

    let membership = await AffiliateTeamMembership.findOne({
      teamId,
      userId: targetId,
    });

    if (membership?.status === "active") {
      return res.status(400).json({
        success: false,
        message: "User is already an active member.",
      });
    }

    if (!membership) {
      membership = await AffiliateTeamMembership.create({
        teamId,
        userId: targetId,
        role: "member",
        status: "pending_invite",
        invitedBy: userId,
      });
    } else {
      membership.status = "pending_invite";
      membership.role = "member";
      membership.invitedBy = userId;
      membership.respondedAt = null;
      membership.leftAt = null;
      await membership.save();
    }

    await notify(
      targetId,
      "Group invite",
      `You were invited to join “${team.name}”.`,
      `/affiliate-teams?team=${teamId}`
    );

    return res.status(201).json({
      success: true,
      message: "Invite sent.",
      membership: {
        _id: membership._id,
        status: membership.status,
        userId: targetId,
      },
    });
  } catch (e) {
    console.error("POST members/invite:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to invite member." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/members/request
 * Any authenticated user requests to join (public groups, or known id)
 */
router.post("/:teamId/members/request", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const team = await AffiliateTeam.findById(teamId);
    if (!team || team.status !== "active") {
      return res.status(404).json({ success: false, message: "Group not found." });
    }
    if (String(team.leaderId) === String(userId)) {
      return res.status(400).json({ success: false, message: "You lead this group." });
    }

    let membership = await AffiliateTeamMembership.findOne({
      teamId,
      userId,
    });
    if (membership?.status === "active") {
      return res.status(400).json({ success: false, message: "Already a member." });
    }

    if (!membership) {
      membership = await AffiliateTeamMembership.create({
        teamId,
        userId,
        role: "member",
        status: "pending_request",
        invitedBy: userId,
      });
    } else {
      membership.status = "pending_request";
      membership.invitedBy = userId;
      membership.respondedAt = null;
      await membership.save();
    }

    await notify(
      team.leaderId,
      "Join request",
      `Someone requested to join “${team.name}”.`,
      `/affiliate-teams?team=${teamId}`
    );

    return res.status(201).json({
      success: true,
      message: "Request sent to the group leader.",
      membership: { _id: membership._id, status: membership.status },
    });
  } catch (e) {
    console.error("POST members/request:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to request join." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/members/:membershipId/respond
 * body: { action: "accept" | "decline" }
 * - pending_invite → target user responds
 * - pending_request → leader responds
 */
router.post("/:teamId/members/:membershipId/respond", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId, membershipId } = req.params;
    const action = String(req.body?.action || "").toLowerCase();

    if (!isOid(teamId) || !isOid(membershipId)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be "accept" or "decline".',
      });
    }

    const team = await AffiliateTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const membership = await AffiliateTeamMembership.findOne({
      _id: membershipId,
      teamId,
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership not found." });
    }

    const isLeader = String(team.leaderId) === String(userId);
    const isInvitee = String(membership.userId) === String(userId);

    if (membership.status === "pending_invite") {
      if (!isInvitee) {
        return res.status(403).json({
          success: false,
          message: "Only the invited user can respond.",
        });
      }
    } else if (membership.status === "pending_request") {
      if (!isLeader) {
        return res.status(403).json({
          success: false,
          message: "Only the leader can respond to join requests.",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to status "${membership.status}".`,
      });
    }

    if (action === "decline") {
      membership.status = "declined";
      membership.respondedAt = new Date();
      await membership.save();
      return res.json({ success: true, message: "Declined.", status: "declined" });
    }

    // Accept
    const activeCount = await AffiliateTeamMembership.countDocuments({
      teamId,
      status: "active",
    });
    if (activeCount >= (team.maxMembers || 25)) {
      return res.status(400).json({
        success: false,
        message: "Group is full.",
      });
    }

    membership.status = "active";
    membership.respondedAt = new Date();
    if (membership.role !== "leader") membership.role = "member";
    await membership.save();
    await syncGroupConversationParticipants(team);

    const notifyUser =
      membership.status === "active" && isLeader
        ? membership.userId
        : team.leaderId;
    await notify(
      isLeader ? membership.userId : team.leaderId,
      "Group membership",
      `You are now a member of “${team.name}”.`,
      `/affiliate-teams?team=${teamId}`
    );

    return res.json({
      success: true,
      message: "Accepted.",
      status: "active",
      conversationId: team.conversationId,
    });
  } catch (e) {
    console.error("POST members/respond:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to respond." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/members/leave
 * Active member leaves (leader cannot leave without transferring — block for v1)
 */
router.post("/:teamId/members/leave", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const team = await AffiliateTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }
    if (String(team.leaderId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "Leaders cannot leave. Pause or archive the group instead.",
      });
    }

    const membership = await AffiliateTeamMembership.findOne({
      teamId,
      userId,
      status: "active",
    });
    if (!membership) {
      return res.status(400).json({ success: false, message: "You are not an active member." });
    }

    membership.status = "left";
    membership.leftAt = new Date();
    await membership.save();
    await syncGroupConversationParticipants(team);

    return res.json({ success: true, message: "You left the group." });
  } catch (e) {
    console.error("POST members/leave:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to leave group." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/members/:targetUserId/remove
 * Leader removes a member
 */
router.post("/:teamId/members/:targetUserId/remove", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId, targetUserId } = req.params;
    if (!isOid(teamId) || !isOid(targetUserId)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const gate = await assertLeader(teamId, userId);
    if (gate.error) {
      return res.status(gate.error.status).json({ success: false, message: gate.error.message });
    }
    const { team } = gate;

    if (String(targetUserId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove yourself as leader.",
      });
    }

    const membership = await AffiliateTeamMembership.findOne({
      teamId,
      userId: targetUserId,
      status: "active",
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: "Active member not found." });
    }

    membership.status = "removed";
    membership.leftAt = new Date();
    await membership.save();
    await syncGroupConversationParticipants(team);

    await notify(
      targetUserId,
      "Removed from group",
      `You were removed from “${team.name}”.`,
      "/affiliate-teams"
    );

    return res.json({ success: true, message: "Member removed." });
  } catch (e) {
    console.error("POST members/remove:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove member." });
  }
});

/* ===========================================================
   FREELANCER PARTNERSHIPS
   =========================================================== */

/**
 * POST /api/affiliate/teams/:teamId/partnerships/invite
 * Leader invites freelancer: body { freelancerId }
 */
router.post("/:teamId/partnerships/invite", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    const freelancerId = req.body?.freelancerId;

    if (!isOid(teamId) || !isOid(freelancerId)) {
      return res.status(400).json({
        success: false,
        message: "teamId and freelancerId are required.",
      });
    }

    const gate = await assertLeader(teamId, userId);
    if (gate.error) {
      return res.status(gate.error.status).json({ success: false, message: gate.error.message });
    }
    const { team } = gate;

    const freelancer = await User.findById(freelancerId).select("role fullName displayName");
    if (!freelancer) {
      return res.status(404).json({ success: false, message: "Freelancer not found." });
    }
    // Allow client accounts that also sell, but prefer freelancer role
    // if (freelancer.role !== "freelancer") { ... } — soft check only
    if (freelancer.role && freelancer.role !== "freelancer" && freelancer.role !== "admin") {
      // still allow if they have services later; warn in message only
    }

    const activePartners = await FreelancerTeamPartnership.countDocuments({
      teamId,
      status: { $in: ["active", "paused"] },
    });
    if (activePartners >= (team.maxFreelancerPartners || 20)) {
      return res.status(400).json({
        success: false,
        message: "Partner roster is full.",
      });
    }

    const freelancersActive = await FreelancerTeamPartnership.countDocuments({
      freelancerId,
      status: { $in: ["active", "paused"] },
    });
    if (freelancersActive >= MAX_FREELANCER_ACTIVE_PARTNERSHIPS) {
      return res.status(400).json({
        success: false,
        message: `This freelancer already has ${MAX_FREELANCER_ACTIVE_PARTNERSHIPS} active partnerships.`,
      });
    }

    let row = await FreelancerTeamPartnership.findOne({ teamId, freelancerId });
    if (row?.status === "active" || row?.status === "paused") {
      return res.status(400).json({
        success: false,
        message: "Partnership already exists.",
      });
    }
    if (!row) {
      row = await FreelancerTeamPartnership.create({
        teamId,
        freelancerId,
        status: "pending_invite",
        initiatedBy: "team",
        invitedBy: userId,
      });
    } else {
      row.status = "pending_invite";
      row.initiatedBy = "team";
      row.invitedBy = userId;
      row.respondedAt = null;
      row.endedAt = null;
      await row.save();
    }

    await notify(
      freelancerId,
      "Marketing partnership invite",
      `Group “${team.name}” wants to promote your services.`,
      `/freelancer-settings#marketing-partners`
    );

    return res.status(201).json({
      success: true,
      message: "Partnership invite sent.",
      partnership: { _id: row._id, status: row.status },
    });
  } catch (e) {
    console.error("POST partnerships/invite:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to invite freelancer." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/partnerships/request
 * Freelancer requests to be promoted by this group
 */
router.post("/:teamId/partnerships/request", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId } = req.params;
    if (!isOid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team id." });
    }

    const team = await AffiliateTeam.findById(teamId);
    if (!team || team.status !== "active") {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const freelancersActive = await FreelancerTeamPartnership.countDocuments({
      freelancerId: userId,
      status: { $in: ["active", "paused"] },
    });
    if (freelancersActive >= MAX_FREELANCER_ACTIVE_PARTNERSHIPS) {
      return res.status(400).json({
        success: false,
        message: `You can partner with at most ${MAX_FREELANCER_ACTIVE_PARTNERSHIPS} groups at once.`,
      });
    }

    let row = await FreelancerTeamPartnership.findOne({
      teamId,
      freelancerId: userId,
    });
    if (row?.status === "active" || row?.status === "paused") {
      return res.status(400).json({ success: false, message: "Already partnered." });
    }

    if (!row) {
      row = await FreelancerTeamPartnership.create({
        teamId,
        freelancerId: userId,
        status: "pending_request",
        initiatedBy: "freelancer",
        invitedBy: userId,
      });
    } else {
      row.status = "pending_request";
      row.initiatedBy = "freelancer";
      row.invitedBy = userId;
      row.respondedAt = null;
      await row.save();
    }

    await notify(
      team.leaderId,
      "Partnership request",
      `A freelancer requested to join “${team.name}” as a partner.`,
      `/affiliate-teams?team=${teamId}`
    );

    return res.status(201).json({
      success: true,
      message: "Request sent to the group leader.",
      partnership: { _id: row._id, status: row.status },
    });
  } catch (e) {
    console.error("POST partnerships/request:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to request partnership." });
  }
});

/**
 * POST /api/affiliate/teams/:teamId/partnerships/:partnershipId/respond
 * body: { action: accept|decline }
 * pending_invite → freelancer responds
 * pending_request → leader responds
 */
router.post(
  "/:teamId/partnerships/:partnershipId/respond",
  auth,
  async (req, res) => {
    try {
      const userId = uid(req);
      const { teamId, partnershipId } = req.params;
      const action = String(req.body?.action || "").toLowerCase();

      if (!isOid(teamId) || !isOid(partnershipId)) {
        return res.status(400).json({ success: false, message: "Invalid id." });
      }
      if (!["accept", "decline"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'action must be "accept" or "decline".',
        });
      }

      const team = await AffiliateTeam.findById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: "Group not found." });
      }

      const row = await FreelancerTeamPartnership.findOne({
        _id: partnershipId,
        teamId,
      });
      if (!row) {
        return res.status(404).json({ success: false, message: "Partnership not found." });
      }

      const isLeader = String(team.leaderId) === String(userId);
      const isFreelancer = String(row.freelancerId) === String(userId);

      if (row.status === "pending_invite" && !isFreelancer) {
        return res.status(403).json({
          success: false,
          message: "Only the invited freelancer can respond.",
        });
      }
      if (row.status === "pending_request" && !isLeader) {
        return res.status(403).json({
          success: false,
          message: "Only the leader can respond to this request.",
        });
      }
      if (!["pending_invite", "pending_request"].includes(row.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot respond to status "${row.status}".`,
        });
      }

      if (action === "decline") {
        row.status = "declined";
        row.respondedAt = new Date();
        await row.save();
        return res.json({ success: true, message: "Declined.", status: "declined" });
      }

      // Cap check again on accept
      const freelancersActive = await FreelancerTeamPartnership.countDocuments({
        freelancerId: row.freelancerId,
        status: { $in: ["active", "paused"] },
      });
      if (freelancersActive >= MAX_FREELANCER_ACTIVE_PARTNERSHIPS) {
        return res.status(400).json({
          success: false,
          message: "Freelancer partnership limit reached.",
        });
      }

      row.status = "active";
      row.respondedAt = new Date();
      await row.save();

      const other = isLeader ? row.freelancerId : team.leaderId;
      await notify(
        other,
        "Partnership active",
        `Partnership with “${team.name}” is now active.`,
        isLeader ? `/freelancer-settings` : `/affiliate-teams?team=${teamId}`
      );

      return res.json({ success: true, message: "Partnership active.", status: "active" });
    } catch (e) {
      console.error("POST partnerships/respond:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to respond." });
    }
  }
);

/**
 * PATCH /api/affiliate/teams/:teamId/partnerships/:partnershipId
 * body: { status: "paused" | "active" | "ended" }
 * Freelancer or leader can pause/end; only leader/freelancer on that row
 */
router.patch("/:teamId/partnerships/:partnershipId", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { teamId, partnershipId } = req.params;
    const next = String(req.body?.status || "").toLowerCase();

    if (!["paused", "active", "ended"].includes(next)) {
      return res.status(400).json({
        success: false,
        message: 'status must be "paused", "active", or "ended".',
      });
    }

    const team = await AffiliateTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const row = await FreelancerTeamPartnership.findOne({
      _id: partnershipId,
      teamId,
    });
    if (!row) {
      return res.status(404).json({ success: false, message: "Partnership not found." });
    }

    const isLeader = String(team.leaderId) === String(userId);
    const isFreelancer = String(row.freelancerId) === String(userId);
    if (!isLeader && !isFreelancer) {
      return res.status(403).json({ success: false, message: "Not allowed." });
    }

    if (!["active", "paused"].includes(row.status) && next !== "ended") {
      return res.status(400).json({
        success: false,
        message: "Only active/paused partnerships can change this way.",
      });
    }

    row.status = next;
    if (next === "paused") row.pausedAt = new Date();
    if (next === "ended") row.endedAt = new Date();
    if (next === "active") row.pausedAt = null;
    await row.save();

    return res.json({ success: true, status: row.status });
  } catch (e) {
    console.error("PATCH partnership:", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update partnership." });
  }
});

module.exports = router;
