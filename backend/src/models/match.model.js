const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    banner_url: { type: String, default: null },
    game_type: {
      type: String,
      enum: ['CS', 'BR'],
      required: true,
    },
    mode: { type: String, default: null },
    max_players: { type: Number, required: true },
    map: { type: String, required: true },
    room_id: { type: String, sparse: true, default: null },
    room_password: { type: String, default: null },
    credentials_set_at: { type: Date, default: null },
    entry_fee: { type: Number, required: true },
    prize_pool: { type: Number, required: true },
    match_date: { type: String, required: true },
    match_time: { type: String, required: true },
    participants: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        team_no: { type: Number },
        joined_at: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'ONGOING', 'REVIEW', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    isPublished: { type: Boolean, default: false },

    // ============ LIFECYCLE TIMESTAMPS ============
    published_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancel_reason: { type: String, default: null },
    started_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },

    // ============ SHARING / INVITE ============
    share_token: {
      type: String,
      unique: true,
      sparse: true,
    },
    invite_code: {
      type: String,
      unique: true,
      sparse: true,
    },
    shared_with: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    share_count: { type: Number, default: 0 },

    // ============ DEADLINES (minutes) ============
    ss_upload_deadline_minutes: { type: Number, default: 2 },
    result_declaration_deadline_minutes: { type: Number, default: 5 },
    ss_upload_expires_at: { type: Date, default: null },
    result_declaration_expires_at: { type: Date, default: null },
    event_type: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'ONLINE',
    },
    venue_name: { type: String, default: null },
    venue_address: { type: String, default: null },
    partner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    mediator_email: { type: String, default: null },
    mediator_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    standard_restrictions: {
      no_grenades: { type: Boolean, default: true },
      sniper_only: { type: Boolean, default: false },
      no_vehicles: { type: Boolean, default: true },
      skills_off: { type: Boolean, default: false },
      disqualified_on_hack: { type: Boolean, default: true },
      non_refundable: { type: Boolean, default: true },
    },
    additional_rules: { type: String, default: null },
    is_sponsored: { type: Boolean, default: false },
    is_premium: { type: Boolean, default: false },
    sponsor_details: {
      sponsor_name: String,
      sponsor_logo: String,
      sponsor_website: String,
      sponsor_description: String,
    },
    // ============ EVENT TYPE (Standard/Sponsored/Premium) ============
    event_category: {
      type: String,
      enum: ['standard', 'sponsored', 'premium'],
      default: 'standard',
    },

    // ============ FRIEND-ONLY (Elite Pass users) ============
    // When true, only the host's accepted friends can join the event.
    is_friend_only: {
      type: Boolean,
      default: false,
    },

    // ============ COMMISSION TRACKING ============
    commission_rate: {
      type: Number,
      default: 1, // 1-5% based on partner tier
      min: 0,
      max: 10,
    },
    commission_amount: {
      type: Number,
      default: 0, // total commission collected from this event
    },
    commission_collected: {
      type: Boolean,
      default: false, // true when commission has been deducted
    },
    total_entry_fees_collected: {
      type: Number,
      default: 0,
    },

    // ============ PARTNER TIER INFO (snapshot at creation) ============
    partner_tier: {
      type: String,
      enum: ['standard', 'sponsored', 'premium', null],
      default: null,
    },

    results: {
      submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      kills: Number,
      damage: Number,
      screenshot_urls: [String],
      submitted_at: Date,
    },
    winner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ============ PER-PARTICIPANT SUBMISSIONS (SS + score) ============
    participant_results: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        kills: { type: Number, default: 0 },
        damage: { type: Number, default: 0 },
        placement: { type: Number, default: 0 },
        score: { type: Number, default: 0 },
        screenshot_urls: [{ type: String }],
        submitted_at: { type: Date, default: Date.now },
        rank: { type: Number, default: null },
      },
    ],

    // ============ AI VERDICT (mock, can be replaced) ============
    ai_verdict: {
      winner_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      confidence: { type: Number, default: 0 },
      reasoning: { type: String, default: null },
      generated_at: { type: Date, default: null },
    },

    // ============ MEDIATOR OVERRIDE REASON ============
    mediator_reject_reason: { type: String, default: null },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejected_at: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

MatchSchema.index({ created_by: 1 });
MatchSchema.index({ partner_id: 1 });
MatchSchema.index({ status: 1, isPublished: 1 });
MatchSchema.index({ location: '2dsphere' });
MatchSchema.index({ match_date: 1, match_time: 1 });
MatchSchema.index({ mediator_user_id: 1 });
MatchSchema.index({ mediator_email: 1 });
MatchSchema.index({ 'participants.user_id': 1 });
MatchSchema.index({ event_type: 1 });
MatchSchema.index({ 'shared_with': 1 });

module.exports = mongoose.model('Match', MatchSchema);
