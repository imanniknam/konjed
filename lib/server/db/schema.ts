import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

/* ───────── enums ───────── */
export const roleEnum = pgEnum("role", ["student", "coach", "parent", "admin"]);
export const skillGroupEnum = pgEnum("skill_group", ["soft", "finance", "entrepreneurship"]);
export const courseCategoryEnum = pgEnum("course_category", ["soft", "finance", "entrepreneurship", "computer", "content", "marketing", "design"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "registering", "running", "finished"]);
export const priceModelEnum = pgEnum("price_model", ["free", "paid"]);
export const gameStatusEnum = pgEnum("game_status", ["draft", "published"]);
export const submissionStatusEnum = pgEnum("submission_status", ["received", "reviewing", "needs_info", "approved", "published", "needs_fix"]);
export const projectKindEnum = pgEnum("project_kind", ["individual", "group", "learning_experience", "idea"]);
export const missionSubmissionStatusEnum = pgEnum("mission_submission_status", ["submitted", "evaluated", "reviewed"]);
export const coachReviewEnum = pgEnum("coach_review", ["pending", "approved", "adjusted"]);
export const challengeStatusEnum = pgEnum("challenge_status", ["upcoming", "active", "finished"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late"]);
export const ledgerKindEnum = pgEnum("ledger_kind", ["points", "coins"]);
export const inboxStatusEnum = pgEnum("inbox_status", ["new", "in_progress", "done"]);

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ───────── identity ───────── */
export const users = pgTable("users", {
  id: id(),
  role: roleEnum("role").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  avatar: text("avatar"),
  birthYear: integer("birth_year"),
  /** blocked by an admin: cannot sign in, sessions are rejected */
  disabled: boolean("disabled").notNull().default(false),
  /** coaches self-register but need admin approval before they can use the coach panel */
  approved: boolean("approved").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_phone_uq").on(t.phone)]);

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

/** Student-specific data. `linkCode` lets a parent attach themselves to a child. */
export const studentProfiles = pgTable("student_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  linkCode: varchar("link_code", { length: 12 }).notNull(),
  points: integer("points").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  level: integer("level").notNull().default(1),
}, (t) => [uniqueIndex("student_link_code_uq").on(t.linkCode)]);

export const parentLinks = pgTable("parent_links", {
  parentId: uuid("parent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.parentId, t.studentId] })]);

/* ───────── school ───────── */
export const courses = pgTable("courses", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  category: courseCategoryEnum("category").notNull(),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  ageMin: integer("age_min").notNull().default(13),
  ageMax: integer("age_max").notNull().default(17),
  status: courseStatusEnum("status").notNull().default("registering"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  capacity: integer("capacity"),
  featured: boolean("featured").notNull().default(false),
  suggested: boolean("suggested").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("courses_slug_uq").on(t.slug)]);

export const classes = pgTable("classes", {
  id: id(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  coachId: uuid("coach_id").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  schedule: text("schedule"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: createdAt(),
}, (t) => [index("classes_coach_idx").on(t.coachId)]);

export const enrollments = pgTable("enrollments", {
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.courseId, t.studentId] })]);

export const missions = pgTable("missions", {
  id: id(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
  stage: integer("stage").notNull().default(1),
  position: integer("position").notNull().default(1),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  skill: varchar("skill", { length: 60 }).notNull(),
  instruction: text("instruction").notNull().default(""),
  minutes: integer("minutes"),
  /** What the session covered; the AI evaluator compares the student's summary against this. */
  contentSummary: text("content_summary").notNull().default(""),
  points: integer("points").notNull().default(50),
  coins: integer("coins").notNull().default(5),
  createdAt: createdAt(),
}, (t) => [index("missions_course_idx").on(t.courseId, t.stage, t.position)]);

export const missionSubmissions = pgTable("mission_submissions", {
  id: id(),
  missionId: uuid("mission_id").notNull().references(() => missions.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text"),
  mediaUrl: text("media_url"),
  mediaKind: varchar("media_kind", { length: 10 }),
  status: missionSubmissionStatusEnum("status").notNull().default("submitted"),
  aiScore: integer("ai_score"),
  aiFeedback: text("ai_feedback"),
  aiProvider: varchar("ai_provider", { length: 20 }),
  coachReview: coachReviewEnum("coach_review").notNull().default("pending"),
  coachScore: integer("coach_score"),
  coachFeedback: text("coach_feedback"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  coinsAwarded: integer("coins_awarded").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("mission_sub_uq").on(t.missionId, t.studentId), index("mission_sub_student_idx").on(t.studentId)]);

/* ───────── arcade ───────── */
export const games = pgTable("games", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  shortText: text("short_text").notNull(),
  cover: text("cover").notNull(),
  accent: varchar("accent", { length: 9 }).notNull().default("#7B5CFF"),
  skillGroup: skillGroupEnum("skill_group").notNull(),
  skillLabel: varchar("skill_label", { length: 80 }).notNull(),
  genre: varchar("genre", { length: 60 }),
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  minutes: integer("minutes"),
  priceModel: priceModelEnum("price_model"),
  priceAmount: integer("price_amount"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  creatorName: varchar("creator_name", { length: 120 }).notNull().default("تیم کنجد"),
  playUrl: text("play_url"),
  featured: boolean("featured").notNull().default(false),
  status: gameStatusEnum("status").notNull().default("published"),
  playsCount: integer("plays_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("games_slug_uq").on(t.slug), index("games_status_idx").on(t.status)]);

export const gamePlays = pgTable("game_plays", {
  id: id(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("game_plays_user_idx").on(t.userId), index("game_plays_game_idx").on(t.gameId)]);

export const gameSubmissions = pgTable("game_submissions", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 200 }).notNull(),
  summary: text("summary"),
  mainSkill: varchar("main_skill", { length: 60 }),
  relatedSkills: text("related_skills"),
  ageGroup: varchar("age_group", { length: 40 }),
  duration: varchar("duration", { length: 40 }),
  kind: varchar("kind", { length: 40 }),
  priceModel: varchar("price_model", { length: 20 }),
  link: text("link"),
  makerName: varchar("maker_name", { length: 120 }),
  contact: varchar("contact", { length: 200 }),
  status: submissionStatusEnum("status").notNull().default("received"),
  adminNote: text("admin_note"),
  createdAt: createdAt(),
});

/* ───────── showcase ───────── */
export const projects = pgTable("projects", {
  id: id(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  skill: varchar("skill", { length: 80 }),
  kind: projectKindEnum("kind").notNull().default("individual"),
  coverUrl: text("cover_url"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 12 }).notNull().default("published"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("projects_author_idx").on(t.authorId), index("projects_status_idx").on(t.status, t.createdAt)]);

export const projectLikes = pgTable("project_likes", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.projectId, t.userId] })]);

export const projectComments = pgTable("project_comments", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
}, (t) => [index("project_comments_project_idx").on(t.projectId)]);

export const badges = pgTable("badges", {
  id: id(),
  code: varchar("code", { length: 60 }).notNull(),
  title: varchar("title", { length: 80 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 40 }).notNull().default("badgeStar"),
  /** Declarative unlock rule: { type: "missions_in_skill"|"missions_total"|"projects"|"games_played"|"challenges"|"group_projects", skill?, count } */
  rule: jsonb("rule").notNull(),
  skillGroup: skillGroupEnum("skill_group"),
}, (t) => [uniqueIndex("badges_code_uq").on(t.code)]);

export const userBadges = pgTable("user_badges", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.badgeId] })]);

export const pointsLedger = pgTable("points_ledger", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: ledgerKindEnum("kind").notNull(),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  refType: varchar("ref_type", { length: 30 }),
  refId: uuid("ref_id"),
  createdAt: createdAt(),
}, (t) => [index("ledger_user_idx").on(t.userId, t.createdAt)]);

/** Per-skill XP, the data behind the parent's skill charts. */
export const skillEvents = pgTable("skill_events", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skill: varchar("skill", { length: 60 }).notNull(),
  score: integer("score").notNull(),
  createdAt: createdAt(),
}, (t) => [index("skill_events_user_idx").on(t.userId, t.createdAt)]);

/* ───────── challenges ───────── */
export const challenges = pgTable("challenges", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  skill: varchar("skill", { length: 120 }).notNull(),
  kind: varchar("kind", { length: 12 }).notNull().default("challenge"),
  deadlineLabel: varchar("deadline_label", { length: 60 }),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: challengeStatusEnum("status").notNull().default("upcoming"),
  points: integer("points").notNull().default(100),
  coins: integer("coins").notNull().default(10),
  badgeCode: varchar("badge_code", { length: 60 }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("challenges_slug_uq").on(t.slug)]);

export const challengeClasses = pgTable("challenge_classes", {
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.challengeId, t.classId] })]);

export const challengeEntries = pgTable("challenge_entries", {
  id: id(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  score: integer("score"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("challenge_entry_uq").on(t.challengeId, t.userId)]);

export const challengeReminders = pgTable("challenge_reminders", {
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.challengeId, t.userId] })]);

/* ───────── coach ───────── */
export const attendanceSessions = pgTable("attendance_sessions", {
  id: id(),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  heldAt: timestamp("held_at", { withTimezone: true }).notNull().defaultNow(),
});
export const attendanceRecords = pgTable("attendance_records", {
  sessionId: uuid("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: attendanceStatusEnum("status").notNull(),
  note: text("note"),
}, (t) => [primaryKey({ columns: [t.sessionId, t.studentId] })]);

/* ───────── platform ───────── */
export const notifications = pgTable("notifications", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 30 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body"),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

export const toolboxItems = pgTable("toolbox_items", {
  id: id(),
  title: varchar("title", { length: 160 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull(),
  skillGroup: skillGroupEnum("skill_group").notNull(),
  body: text("body").notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  subject: varchar("subject", { length: 80 }),
  message: text("message").notNull(),
  status: inboxStatusEnum("status").notNull().default("new"),
  createdAt: createdAt(),
});

export const collabRequests = pgTable("collab_requests", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  org: varchar("org", { length: 160 }),
  type: varchar("type", { length: 80 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 200 }),
  description: text("description"),
  link: text("link"),
  status: inboxStatusEnum("status").notNull().default("new"),
  createdAt: createdAt(),
});

/* ───────── CMS + audit ───────── */
/** Editable site content (page copy, home sections, nav/footer). `key` examples: "home", "chrome", "page:games/skills". */
export const cmsDocuments = pgTable("cms_documents", {
  key: varchar("key", { length: 120 }).primaryKey(),
  data: jsonb("data").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const cmsRevisions = pgTable("cms_revisions", {
  id: id(),
  key: varchar("key", { length: 120 }).notNull(),
  data: jsonb("data").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("cms_rev_key_idx").on(t.key, t.createdAt)]);

export const auditLog = pgTable("audit_log", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 40 }).notNull(),
  resource: varchar("resource", { length: 60 }).notNull(),
  refId: varchar("ref_id", { length: 80 }),
  summary: text("summary"),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);
