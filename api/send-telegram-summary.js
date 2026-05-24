import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const cronSecret = process.env.CRON_SECRET;

function bangkokNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function addDaysISO(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function isTaskOnDate(task, isoDate) {
  const start = task.start_date || task.date;
  const end = task.end_date || task.start_date || task.date;
  return start <= isoDate && isoDate <= end;
}

function formatTime(task) {
  if (task.is_all_day || task.event_type === 'trip') return 'ทั้งวัน';
  return `${String(task.start_time || '--:--').slice(0, 5)}-${String(task.end_time || '--:--').slice(0, 5)}`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function memberIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n === 'bright' || n === 'benay') return '👧';
  if (n === 'brill') return '👦';
  if (n === 'pui') return '👩';
  if (n === 'ball') return '👨';
  return '👤';
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const body = await res.json();
  if (!body.ok) throw new Error(body.description || 'Telegram send failed');
  return body;
}

async function alreadySent(supabase, logKey) {
  const { data, error } = await supabase
    .from('telegram_logs')
    .select('id')
    .eq('log_key', logKey)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function markSent(supabase, logKey) {
  const { error } = await supabase.from('telegram_logs').insert({ log_key: logKey });
  if (error && error.code !== '23505') throw error;
}

async function getFamilyOwners(supabase) {
  // owner จริง = user_id ที่มีสมาชิก family_members อยู่
  // child/parent account ที่ไม่มีสมาชิกของตัวเองจะไม่ถูกส่ง summary แยก
  const { data, error } = await supabase.from('family_members').select('user_id');
  if (error) throw error;
  return Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean)));
}

async function getSettingForOwner(supabase, ownerId) {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', ownerId)
    .maybeSingle();

  if (error) throw error;

  return data || {
    user_id: ownerId,
    telegram_enabled: true,
    daily_summary_enabled: true,
    daily_summary_time: '07:00',
    next_day_summary_enabled: false,
    next_day_summary_time: '21:00',
  };
}

async function buildSummaryMessage(supabase, ownerId, targetDate, titlePrefix) {
  const [membersRes, tasksRes, linksRes] = await Promise.all([
    supabase.from('family_members').select('id,name').eq('user_id', ownerId).order('created_at'),
    supabase.from('tasks').select('*').eq('user_id', ownerId).or(`date.eq.${targetDate},start_date.lte.${targetDate}`),
    supabase.from('task_members').select('task_id,member_id').eq('user_id', ownerId),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (linksRes.error) throw linksRes.error;

  const members = membersRes.data || [];
  const tasks = (tasksRes.data || [])
    .filter((task) => isTaskOnDate(task, targetDate))
    .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

  const links = linksRes.data || [];
  const taskToMemberIds = new Map();

  for (const link of links) {
    if (!taskToMemberIds.has(link.task_id)) taskToMemberIds.set(link.task_id, []);
    taskToMemberIds.get(link.task_id).push(link.member_id);
  }

  let text = `📅 <b>${escapeHtml(titlePrefix.replace('📅 ', ''))}</b> (${targetDate})\n`;

  if (!tasks.length) return `${text}\nไม่มีรายการ`;

  for (const member of members) {
    const memberTasks = tasks.filter((task) => (taskToMemberIds.get(task.id) || []).includes(member.id));
    if (!memberTasks.length) continue;

    text += `\n${memberIcon(member.name)} <b>${escapeHtml(member.name)}</b>\n`;

    for (const task of memberTasks) {
      text += `• ${formatTime(task)} ${escapeHtml(task.title)}\n`;
      if (task.event_type === 'trip') {
        text += `  ✈️ ${task.start_date || task.date} ถึง ${task.end_date || task.start_date || task.date}\n`;
      }
      if (task.note) text += `  📝 ${escapeHtml(task.note)}\n`;
    }
  }

  return text.trim();
}

export default async function handler(req, res) {
  try {
    if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ ok: false, error: 'Missing Supabase env vars' });
    }

    if (!telegramToken || !telegramChatId) {
      return res.status(500).json({ ok: false, error: 'Missing Telegram env vars' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = bangkokNow();
    const tomorrow = addDaysISO(now.date, 1);
    const ownerIds = await getFamilyOwners(supabase);

    let sent = 0;
    let skipped = 0;
    const logs = [];

    for (const ownerId of ownerIds) {
      const setting = await getSettingForOwner(supabase, ownerId);
      if (!setting.telegram_enabled) continue;

      const todayLogKey = `group-today-${telegramChatId}-${now.date}`;
      const tomorrowLogKey = `group-tomorrow-${telegramChatId}-${tomorrow}`;

      if (setting.daily_summary_enabled && (setting.daily_summary_time || '07:00') === now.time) {
        if (await alreadySent(supabase, todayLogKey)) {
          skipped += 1;
          logs.push({ type: 'today', status: 'skipped_duplicate', targetDate: now.date });
        } else {
          const msg = await buildSummaryMessage(supabase, ownerId, now.date, '📅 ตารางวันนี้');
          await sendTelegram(msg);
          await markSent(supabase, todayLogKey);
          sent += 1;
          logs.push({ type: 'today', status: 'sent', ownerId, targetDate: now.date });
        }
      }

      if (setting.next_day_summary_enabled && (setting.next_day_summary_time || '21:00') === now.time) {
        if (await alreadySent(supabase, tomorrowLogKey)) {
          skipped += 1;
          logs.push({ type: 'tomorrow', status: 'skipped_duplicate', targetDate: tomorrow });
        } else {
          const msg = await buildSummaryMessage(supabase, ownerId, tomorrow, '📅 ตารางพรุ่งนี้');
          await sendTelegram(msg);
          await markSent(supabase, tomorrowLogKey);
          sent += 1;
          logs.push({ type: 'tomorrow', status: 'sent', ownerId, targetDate: tomorrow });
        }
      }
    }

    return res.status(200).json({ ok: true, now, tomorrow, ownerIds, sent, skipped, logs });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
