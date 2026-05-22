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

// สำคัญ: ห้ามใช้ new Date(`${iso}+07:00`) แล้ว getDate() เพราะ Vercel รันเป็น UTC
// ใช้วิธีคำนวณจาก YYYY-MM-DD ตรง ๆ เพื่อไม่ให้ "พรุ่งนี้" กลายเป็น "วันนี้"
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

  let text = `<b>${escapeHtml(titlePrefix)} (${targetDate})</b>\n`;

  if (!tasks.length) return `${text}\nไม่มีรายการ`;

  for (const member of members) {
    const memberTasks = tasks.filter((task) => (taskToMemberIds.get(task.id) || []).includes(member.id));
    if (!memberTasks.length) continue;

    text += `\n<b>${escapeHtml(member.name)}</b>\n`;

    for (const task of memberTasks) {
      text += `• ${formatTime(task)} ${escapeHtml(task.title)}\n`;
      if (task.event_type === 'trip') text += `  ✈️ ${task.start_date || task.date} ถึง ${task.end_date || task.start_date || task.date}\n`;
      //if (task.location_url) text += `  📍 ${escapeHtml(task.location_url)}\n`;
      //if (task.zoom_url) text += `  🎥 ${escapeHtml(task.zoom_url)}\n`;
      if (task.note) text += `  📝 ${escapeHtml(task.note)}\n`;
    }
  }

  return text;
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

    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('telegram_enabled', true);

    if (error) throw error;

    let sent = 0;
    const logs = [];

    for (const setting of settings || []) {
      if (setting.daily_summary_enabled && (setting.daily_summary_time || '07:00') === now.time) {
        const msg = await buildSummaryMessage(supabase, setting.user_id, now.date, '📅 ตารางวันนี้');
        await sendTelegram(msg);
        sent += 1;
        logs.push({ type: 'today', user_id: setting.user_id, targetDate: now.date });
      }

      if (setting.next_day_summary_enabled && (setting.next_day_summary_time || '21:00') === now.time) {
        const msg = await buildSummaryMessage(supabase, setting.user_id, tomorrow, '📅 ตารางพรุ่งนี้');
        await sendTelegram(msg);
        sent += 1;
        logs.push({ type: 'tomorrow', user_id: setting.user_id, targetDate: tomorrow });
      }
    }

    return res.status(200).json({ ok: true, now, tomorrow, sent, logs });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
}
