import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import { notificationAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

type BroadcastJob = {
  id: string;
  title: string;
  body: string;
  target: string;
  image: string | null;
  sendMode: "instant" | "scheduled";
  scheduledAt: string | null;
  status: "scheduled" | "queued" | "processing" | "completed" | "failed" | "cancelled";
  totalUsers: number;
  sentCount: number;
  failedCount: number;
  currentBatch: number;
  totalBatches: number;
  progress: number;
  elapsed: number;
  estimatedRemaining: number;
  countdown: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
};

const BATCH_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
];

const DELAY_OPTIONS = [
  { value: 3000, label: "3s" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 15000, label: "15s" },
];

export const PushNotificationScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showConfirm, PopupElement } = usePopup();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "partners" | "premium">("all");
  const [batchSize, setBatchSize] = useState(50);
  const [batchDelay, setBatchDelay] = useState(5000);
  const [sending, setSending] = useState(false);

  // Send mode
  const [sendMode, setSendMode] = useState<"instant" | "scheduled">("instant");
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 3600000)); // Default: +1 hour
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Image
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Progress tracking
  const [activeJob, setActiveJob] = useState<BroadcastJob | null>(null);
  const [jobHistory, setJobHistory] = useState<BroadcastJob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Countdown timer for scheduled jobs
  useEffect(() => {
    if (activeJob && activeJob.status === "scheduled") {
      countdownRef.current = setInterval(() => {
        setActiveJob((prev) => {
          if (!prev || prev.status !== "scheduled" || !prev.scheduledAt) return prev;
          const remaining = Math.max(0, Math.floor((new Date(prev.scheduledAt).getTime() - Date.now()) / 1000));
          if (remaining <= 0) {
            // Time to send! Start polling for processing status
            if (countdownRef.current) clearInterval(countdownRef.current);
            startPolling(prev.id);
            return { ...prev, countdown: 0, status: "queued" };
          }
          return { ...prev, countdown: remaining };
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [activeJob?.status]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showError("Required", "Please enter title and message");
      return;
    }

    const targetLabel = target === "all" ? "all users" : target === "partners" ? "all partners" : "premium users";
    const modeLabel = sendMode === "instant"
      ? `Instant — Batch: ${batchSize} users every ${batchDelay / 1000}s`
      : `Scheduled for ${scheduledDate.toLocaleString()}`;
    const imageLabel = imageUrl.trim() ? "\nImage attached" : "";

    showConfirm(
      "Send Push Notification",
      `Send to ${targetLabel}?\n\n${modeLabel}${imageLabel}`,
      async () => {
        setSending(true);
        try {
          const payload: any = {
            title: title.trim(),
            body: body.trim(),
            target,
            batchSize,
            batchDelay,
            sendMode,
          };

          if (sendMode === "scheduled") {
            payload.scheduledAt = scheduledDate.toISOString();
          }

          if (imageUrl.trim()) {
            payload.image = imageUrl.trim();
          }

          const res = await notificationAPI.sendBroadcast(payload);

          if (res.data.success) {
            const job = res.data.data;
            const newJob: BroadcastJob = {
              id: job.jobId,
              title: title.trim(),
              body: body.trim(),
              target,
              image: imageUrl.trim() || null,
              sendMode: job.sendMode,
              scheduledAt: job.scheduledAt,
              status: job.sendMode === "scheduled" ? "scheduled" : "queued",
              totalUsers: job.totalUsers,
              sentCount: 0,
              failedCount: 0,
              currentBatch: 0,
              totalBatches: job.totalBatches,
              progress: 0,
              elapsed: 0,
              estimatedRemaining: 0,
              countdown: job.scheduledAt ? Math.max(0, Math.floor((new Date(job.scheduledAt).getTime() - Date.now()) / 1000)) : 0,
              createdAt: new Date().toISOString(),
              startedAt: null,
              completedAt: null,
              error: null,
            };

            setActiveJob(newJob);

            if (job.sendMode === "instant") {
              startPolling(job.jobId);
            } else {
              // Start countdown polling
              startScheduledPolling(job.jobId);
            }

            // Clear form
            setTitle("");
            setBody("");
            setImageUrl("");
          }
        } catch (err: any) {
          const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to send";
          const detail = err.response?.status ? ` (Status: ${err.response.status})` : "";
          showError("Error", `${msg}${detail}`);
        } finally {
          setSending(false);
        }
      },
      "Send"
    );
  };

  const startPolling = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await notificationAPI.getBroadcastStatus(jobId);
        if (res.data.success) {
          const status = res.data.data;
          setActiveJob((prev) => (prev ? { ...prev, ...status } : null));

          if (["completed", "failed", "cancelled"].includes(status.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            setActiveJob((prev) => {
              if (prev) {
                setJobHistory((h) => [prev, ...h].slice(0, 10));
              }
              return null;
            });
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2000);
  };

  const startScheduledPolling = (jobId: string) => {
    // Poll every 30 seconds for scheduled jobs
    pollRef.current = setInterval(async () => {
      try {
        const res = await notificationAPI.getBroadcastStatus(jobId);
        if (res.data.success) {
          const status = res.data.data;
          setActiveJob((prev) => (prev ? { ...prev, ...status } : null));

          // If job started processing, switch to fast polling
          if (status.status === "processing") {
            if (pollRef.current) clearInterval(pollRef.current);
            startPolling(jobId);
          }

          if (["completed", "failed", "cancelled"].includes(status.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            setActiveJob((prev) => {
              if (prev) {
                setJobHistory((h) => [prev, ...h].slice(0, 10));
              }
              return null;
            });
          }
        }
      } catch (err) {
        console.error("Scheduled poll error:", err);
      }
    }, 30000);
  };

  const handleCancel = async (jobId: string) => {
    showConfirm("Cancel Broadcast", "Are you sure you want to cancel this broadcast?", async () => {
      try {
        await notificationAPI.cancelBroadcast(jobId);
        if (pollRef.current) clearInterval(pollRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setActiveJob(null);
      } catch (err: any) {
        showError("Error", err.response?.data?.message || "Failed to cancel");
      }
    }, "Yes, Cancel");
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Sending now...";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${mins}m ${secs}s`;
  };

  const targets = [
    { key: "all", label: "All Users", icon: "people", color: COLORS.primary },
    { key: "partners", label: "Partners", icon: "handshake", color: "#fbbf24" },
    { key: "premium", label: "Premium", icon: "workspace-premium", color: "#a855f7" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "#a855f7";
      case "queued": return "#fbbf24";
      case "processing": return "#3b82f6";
      case "completed": return "#22c55e";
      case "failed": return "#ef4444";
      case "cancelled": return "#94a3b8";
      default: return COLORS.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return "event";
      case "queued": return "schedule";
      case "processing": return "sync";
      case "completed": return "check-circle";
      case "failed": return "error";
      case "cancelled": return "cancel";
      default: return "info";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "SCHEDULED";
      case "queued": return "QUEUED";
      case "processing": return "SENDING";
      case "completed": return "COMPLETED";
      case "failed": return "FAILED";
      case "cancelled": return "CANCELLED";
      default: return status.toUpperCase();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(59,130,246,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Push Notification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Active Job Progress */}
        {activeJob && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeJob.status) + "20" }]}>
                <MaterialIcons name={getStatusIcon(activeJob.status) as any} size={14} color={getStatusColor(activeJob.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(activeJob.status) }]}>
                  {getStatusLabel(activeJob.status)}
                </Text>
              </View>
              {(activeJob.status === "scheduled" || activeJob.status === "queued" || activeJob.status === "processing") && (
                <TouchableOpacity onPress={() => handleCancel(activeJob.id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.progressTitle} numberOfLines={1}>{activeJob.title}</Text>

            {/* Scheduled countdown */}
            {activeJob.status === "scheduled" && activeJob.countdown > 0 && (
              <View style={styles.countdownBox}>
                <MaterialIcons name="timer" size={20} color="#a855f7" />
                <Text style={styles.countdownText}>{formatCountdown(activeJob.countdown)}</Text>
                <Text style={styles.countdownLabel}>until sent</Text>
              </View>
            )}

            {/* Image preview in progress card */}
            {activeJob.image && (
              <Image source={{ uri: activeJob.image }} style={styles.progressImage} resizeMode="cover" />
            )}

            {/* Progress Bar */}
            {(activeJob.status === "processing" || activeJob.status === "completed") && (
              <>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${activeJob.progress}%`, backgroundColor: getStatusColor(activeJob.status) }]} />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{activeJob.sentCount}</Text>
                    <Text style={styles.statLabel}>Sent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: "#ef4444" }]}>{activeJob.failedCount}</Text>
                    <Text style={styles.statLabel}>Failed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{activeJob.currentBatch}/{activeJob.totalBatches}</Text>
                    <Text style={styles.statLabel}>Batches</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{activeJob.progress}%</Text>
                    <Text style={styles.statLabel}>Progress</Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {activeJob.status === "processing"
                  ? `Elapsed: ${activeJob.elapsed}s | Remaining: ${formatTime(activeJob.estimatedRemaining)}`
                  : activeJob.status === "completed"
                    ? `Completed in ${activeJob.elapsed}s`
                    : activeJob.status === "scheduled"
                      ? `Scheduled for ${new Date(activeJob.scheduledAt!).toLocaleString()}`
                      : `${activeJob.sendMode === "instant" ? "Instant" : "Scheduled"} | ${activeJob.totalUsers} users`}
              </Text>
            </View>
          </View>
        )}

        {/* ===== SEND MODE ===== */}
        <Text style={styles.sectionTitle}>SEND MODE</Text>
        <View style={styles.targetRow}>
          <TouchableOpacity
            style={[styles.targetCard, sendMode === "instant" && { borderColor: "#22c55e", borderWidth: 2 }]}
            onPress={() => setSendMode("instant")}
            disabled={sending || !!activeJob}
          >
            <View style={[styles.targetIcon, { backgroundColor: "#22c55e15" }]}>
              <MaterialIcons name="send" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.targetLabel, { color: sendMode === "instant" ? "#22c55e" : "rgba(255,255,255,0.5)" }]}>Instant</Text>
            <Text style={styles.targetSubLabel}>Send now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetCard, sendMode === "scheduled" && { borderColor: "#a855f7", borderWidth: 2 }]}
            onPress={() => setSendMode("scheduled")}
            disabled={sending || !!activeJob}
          >
            <View style={[styles.targetIcon, { backgroundColor: "#a855f715" }]}>
              <MaterialIcons name="event" size={20} color="#a855f7" />
            </View>
            <Text style={[styles.targetLabel, { color: sendMode === "scheduled" ? "#a855f7" : "rgba(255,255,255,0.5)" }]}>Scheduled</Text>
            <Text style={styles.targetSubLabel}>Pick date & time</Text>
          </TouchableOpacity>
        </View>

        {/* Date/Time Picker (only when scheduled) */}
        {sendMode === "scheduled" && (
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionTitle}>SCHEDULE DATE & TIME</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
                disabled={sending || !!activeJob}
              >
                <MaterialIcons name="calendar-today" size={18} color="#a855f7" />
                <Text style={styles.datePickerText}>{scheduledDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowTimePicker(true)}
                disabled={sending || !!activeJob}
              >
                <MaterialIcons name="access-time" size={18} color="#a855f7" />
                <Text style={styles.datePickerText}>{scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </TouchableOpacity>
            </View>

            {/* Quick schedule options */}
            <View style={styles.quickScheduleRow}>
              {[
                { label: "+1 Hour", offset: 3600000 },
                { label: "+3 Hours", offset: 10800000 },
                { label: "Tomorrow 10AM", offset: getTomorrow10AM() - Date.now() },
                { label: "Next Monday", offset: getNextMonday9AM() - Date.now() },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={styles.quickScheduleBtn}
                  onPress={() => setScheduledDate(new Date(Date.now() + opt.offset))}
                  disabled={sending || !!activeJob}
                >
                  <Text style={styles.quickScheduleText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) {
                const newDate = new Date(scheduledDate);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setScheduledDate(newDate);
              }
            }}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="time"
            is24Hour={true}
            onChange={(_, time) => {
              setShowTimePicker(false);
              if (time) {
                const newDate = new Date(scheduledDate);
                newDate.setHours(time.getHours(), time.getMinutes(), 0);
                setScheduledDate(newDate);
              }
            }}
          />
        )}

        {/* Target Selection */}
        <Text style={styles.sectionTitle}>SEND TO</Text>
        <View style={styles.targetRow}>
          {targets.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.targetCard, target === t.key && { borderColor: t.color, borderWidth: 2 }]}
              onPress={() => setTarget(t.key as any)}
              disabled={sending || !!activeJob}
            >
              <View style={[styles.targetIcon, { backgroundColor: t.color + "15" }]}>
                <MaterialIcons name={t.icon as any} size={20} color={t.color} />
              </View>
              <Text style={[styles.targetLabel, { color: target === t.key ? t.color : "rgba(255,255,255,0.5)" }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Batch Size */}
        <Text style={styles.sectionTitle}>BATCH SIZE (users per batch)</Text>
        <View style={styles.optionRow}>
          {BATCH_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, batchSize === opt.value && styles.optionActive]}
              onPress={() => setBatchSize(opt.value)}
              disabled={sending || !!activeJob}
            >
              <Text style={[styles.optionText, batchSize === opt.value && styles.optionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Batch Delay */}
        <Text style={styles.sectionTitle}>DELAY BETWEEN BATCHES</Text>
        <View style={styles.optionRow}>
          {DELAY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, batchDelay === opt.value && styles.optionActive]}
              onPress={() => setBatchDelay(opt.value)}
              disabled={sending || !!activeJob}
            >
              <Text style={[styles.optionText, batchDelay === opt.value && styles.optionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.sectionTitle}>TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="Notification title"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          editable={!sending && !activeJob}
        />

        {/* Body */}
        <Text style={styles.sectionTitle}>MESSAGE</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your message..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={5}
          maxLength={500}
          editable={!sending && !activeJob}
        />
        <Text style={styles.charCount}>{body.length}/500</Text>

        {/* Image URL */}
        <Text style={styles.sectionTitle}>IMAGE (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/image.png"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={imageUrl}
          onChangeText={(text) => {
            setImageUrl(text);
            setImagePreviewError(false);
          }}
          maxLength={500}
          editable={!sending && !activeJob}
          keyboardType="url"
          autoCapitalize="none"
        />

        {/* Image Preview */}
        {imageUrl.trim() !== "" && !imagePreviewError && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: imageUrl.trim() }}
              style={styles.imagePreview}
              resizeMode="cover"
              onError={() => setImagePreviewError(true)}
            />
            <TouchableOpacity
              style={styles.imageRemoveBtn}
              onPress={() => { setImageUrl(""); setImagePreviewError(false); }}
            >
              <MaterialIcons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {imagePreviewError && imageUrl.trim() !== "" && (
          <View style={styles.imageErrorContainer}>
            <MaterialIcons name="broken-image" size={16} color="#ef4444" />
            <Text style={styles.imageErrorText}>Invalid image URL</Text>
          </View>
        )}

        {/* Preview */}
        {(title || body) && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            {imageUrl.trim() !== "" && !imagePreviewError && (
              <Image
                source={{ uri: imageUrl.trim() }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.previewNotif}>
              <View style={styles.previewIcon}>
                <MaterialIcons name="notifications" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{title || "Title"}</Text>
                <Text style={styles.previewBody} numberOfLines={2}>{body || "Message"}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={16} color="rgba(255,255,255,0.4)" />
          <Text style={styles.infoText}>
            {sendMode === "instant"
              ? `Instant mode: ${batchSize} users every ${batchDelay / 1000}s. Job continues in background.`
              : `Scheduled: Notification will be sent on ${scheduledDate.toLocaleString()} in batches of ${batchSize}. Server must be running.`}
            {imageUrl.trim() ? "\nImage will be shown in the push notification on supported devices." : ""}
          </Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, (!title || !body || sending || !!activeJob) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!title || !body || sending || !!activeJob}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialIcons name={sendMode === "scheduled" ? "event" : "send"} size={18} color="white" />
              <Text style={styles.sendBtnText}>
                {activeJob
                  ? "JOB IN PROGRESS..."
                  : sendMode === "scheduled"
                    ? "SCHEDULE NOTIFICATION"
                    : "SEND NOW"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Job History */}
        {jobHistory.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>RECENT JOBS</Text>
            {jobHistory.map((job) => (
              <View key={job.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{job.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + "20" }]}>
                    <MaterialIcons name={getStatusIcon(job.status) as any} size={12} color={getStatusColor(job.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(job.status), fontSize: 10 }]}>
                      {getStatusLabel(job.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyStats}>
                  <Text style={styles.historyStat}>
                    {job.sendMode === "instant" ? "Instant" : "Scheduled"} | {job.target} | {job.sentCount}/{job.totalUsers} sent | {job.failedCount} failed
                  </Text>
                  {job.image && (
                    <Text style={[styles.historyStat, { color: "#3b82f6" }]}>Image attached</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <PopupElement />
    </View>
  );
};

// Helper functions for quick schedule
function getTomorrow10AM(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}

function getNextMonday9AM(): number {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day; // Monday
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginTop: 20, marginBottom: 12, marginLeft: 4 },

  // Target / Mode
  targetRow: { flexDirection: "row", gap: 10 },
  targetCard: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 6 },
  targetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  targetLabel: { fontSize: 12, fontWeight: "bold" },
  targetSubLabel: { fontSize: 9, color: "rgba(255,255,255,0.25)" },

  // Schedule
  scheduleContainer: { marginTop: 8 },
  datePickerRow: { flexDirection: "row", gap: 10 },
  datePickerBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(168,85,247,0.2)" },
  datePickerText: { color: "white", fontSize: 14, fontWeight: "600" },
  quickScheduleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickScheduleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(168,85,247,0.1)", borderWidth: 1, borderColor: "rgba(168,85,247,0.2)" },
  quickScheduleText: { color: "#a855f7", fontSize: 11, fontWeight: "600" },

  // Batch Options
  optionRow: { flexDirection: "row", gap: 10 },
  optionCard: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "15" },
  optionText: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "bold" },
  optionTextActive: { color: COLORS.primary },

  // Inputs
  input: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 16, paddingVertical: 14, color: "white", fontSize: 15 },
  textArea: { height: 120, textAlignVertical: "top" },
  charCount: { color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "right", marginTop: 6 },

  // Image
  imagePreviewContainer: { marginTop: 10, borderRadius: 14, overflow: "hidden", height: 150, position: "relative" },
  imagePreview: { width: "100%", height: "100%", borderRadius: 14 },
  imageRemoveBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  imageErrorContainer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, padding: 12, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  imageErrorText: { color: "#ef4444", fontSize: 12 },

  // Preview
  previewCard: { marginTop: 20, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  previewLabel: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 },
  previewImage: { width: "100%", height: 120, borderRadius: 10, marginBottom: 12 },
  previewNotif: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  previewIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(244,123,37,0.1)", alignItems: "center", justifyContent: "center" },
  previewTitle: { color: "white", fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  previewBody: { color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 18 },

  // Info
  infoCard: { flexDirection: "row", gap: 10, marginTop: 16, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" },
  infoText: { flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 18 },

  // Send
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, marginTop: 24 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "white", fontSize: 14, fontWeight: "bold", letterSpacing: 1 },

  // Progress Card
  progressCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "bold", letterSpacing: 0.5 },
  cancelText: { color: "#ef4444", fontSize: 12, fontWeight: "bold" },
  progressTitle: { color: "white", fontSize: 15, fontWeight: "bold", marginBottom: 14 },
  progressImage: { width: "100%", height: 100, borderRadius: 10, marginBottom: 14 },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 16 },
  progressBarFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { color: "white", fontSize: 16, fontWeight: "bold" },
  statLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 },
  timeRow: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 10 },
  timeText: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center" },

  // Countdown
  countdownBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(168,85,247,0.1)", borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(168,85,247,0.2)" },
  countdownText: { color: "#a855f7", fontSize: 24, fontWeight: "bold" },
  countdownLabel: { color: "rgba(168,85,247,0.6)", fontSize: 12 },

  // History
  historyCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  historyTitle: { color: "white", fontSize: 13, fontWeight: "600", flex: 1, marginRight: 8 },
  historyStats: {},
  historyStat: { color: "rgba(255,255,255,0.35)", fontSize: 11 },
});
