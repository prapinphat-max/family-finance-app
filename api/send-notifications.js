import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const vapidPublicKey =
  process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

const vapidSubject =
  process.env.VAPID_SUBJECT || 'mailto:prapinphat@gmail.com';

const REMIND_BEFORE_MINUTES = Number(
  process.env.REMIND_BEFORE_MINUTES || 15
);

const WINDOW_MINUTES = Number(
  process.env.REMIND_WINDOW_MINUTES || 2
);

function isoDateInBangkok(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
}

function nowMinutesInBangkok(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const h = Number(parts.find((p) => p.type === 'hour')?.value);

  const m = Number(parts.find((p) => p.type === 'minute')?.value);

  return h * 60 + m;
}

function timeToMinutes(t) {
  if (!t) return null;

  const [hh, mm] = String(t).split(':').map(Number);

  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  return hh * 60 + mm;
}

function taskIsToday(task, today) {
  const start = task.start_date || task.date;
  const end = task.end_date || task.start_date || task.date;

  return start <= today && today <= end;
}

function shouldNotifyTask(task, today, nowMin) {
  if (task.is_all_day || task.event_type === 'trip') return false;

  if (!taskIsToday(task, today)) return false;

  const startMin = timeToMinutes(task.start_time);

  if (startMin === null) return false;

  const minutesUntilStart = startMin - nowMin;

  return (
    minutesUntilStart > 0 &&
    minutesUntilStart <=
      REMIND_BEFORE_MINUTES + WINDOW_MINUTES
  );
}

function notifyAtKey(today, task) {
  return `${today}T${String(task.start_time || '00:00').slice(
    0,
    5
  )}:00+07:00`;
}

async function getRecipientUserIds(supabase, task) {
  const ids = new Set([task.user_id]);

  const { data: links } = await supabase
    .from('task_members')
    .select('member_id, family_members(auth_user_id)')
    .eq('task_id', task.id);

  for (const link of links || []) {
    const uid = link.family_members?.auth_user_id;

    if (uid) ids.add(uid);
  }

  const { data: parentMembers } = await supabase
    .from('family_members')
    .select('auth_user_id, role, can_add_group_tasks')
    .eq('user_id', task.user_id);

  for (const m of parentMembers || []) {
    if (
      m.auth_user_id &&
      (m.role === 'parent' ||
        m.can_add_group_tasks === true)
    ) {
      ids.add(m.auth_user_id);
    }
  }

  return Array.from(ids).filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (
      cronSecret &&
      req.headers.authorization !==
        `Bearer ${cronSecret}`
    ) {
      return res
        .status(401)
        .json({ ok: false, error: 'Unauthorized' });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        ok: false,
        error: 'Missing Supabase env vars',
      });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({
        ok: false,
        error: 'Missing VAPID env vars',
      });
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const now = new Date();

    const today = isoDateInBangkok(now);

    const nowMin = nowMinutesInBangkok(now);

    const { data: tasks, error: taskError } =
      await supabase
        .from('tasks')
        .select(
          'id,user_id,title,date,start_date,end_date,start_time,end_time,is_all_day,event_type,note'
        )
        .eq('date', today);

    if (taskError) throw taskError;

    const dueTasks = (tasks || []).filter((task) =>
      shouldNotifyTask(task, today, nowMin)
    );

    let sent = 0;

    let skipped = 0;

    let failed = 0;

    for (const task of dueTasks) {
      const notifyAt = notifyAtKey(today, task);

      const recipientIds =
        await getRecipientUserIds(
          supabase,
          task
        );

      for (const userId of recipientIds) {
        const { data: existingLog } =
          await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('task_id', task.id)
            .eq('notify_at', notifyAt)
            .maybeSingle();

        if (existingLog) {
          skipped += 1;
          continue;
        }

        const { data: subscriptions } =
          await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (!subscriptions?.length) {
          skipped += 1;
          continue;
        }

        const payload = JSON.stringify({
          title: `⏰ อีก ${REMIND_BEFORE_MINUTES} นาที: ${task.title}`,
          body: `${String(
            task.start_time || ''
          ).slice(0, 5)}-${String(
            task.end_time || ''
          ).slice(0, 5)} ${task.note || ''}`,
          url: '/',
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            );

            sent += 1;
          } catch (e) {
            failed += 1;

            if (
              e.statusCode === 404 ||
              e.statusCode === 410
            ) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
            }
          }
        }

        await supabase
          .from('notification_logs')
          .insert({
            user_id: userId,
            task_id: task.id,
            notify_at: notifyAt,
          });
      }
    }

    return res.status(200).json({
      ok: true,
      today,
      nowMin,
      remindBeforeMinutes:
        REMIND_BEFORE_MINUTES,
      windowMinutes: WINDOW_MINUTES,
      tasksFound: (tasks || []).length,
      dueTasks: dueTasks.length,
      dueTaskTitles: dueTasks.map(
        (t) => `${t.start_time} ${t.title}`
      ),
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || String(error),
    });
  }
}