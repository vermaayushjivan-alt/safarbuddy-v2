// ROOT PATH: src/app/api/cron/auto-publish/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import campaigns from '@/data/campaigns.json';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Env values me aksar quotes / space / newline chali jaati hai -> Meta 'Cannot parse access token' deta hai
const cleanEnv = (v?: string) => (v ?? '').replace(/^[\s"']+|[\s"']+$/g, '').replace(/\s+/g, '') || undefined;

const SITE_URL = (cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) || 'https://safarbuddy-v2-two.vercel.app').replace(/\/$/, '');
// Facebook caption me URL clickable hota hai; Instagram caption me nahi (isliye 'link in bio')
const fbLinkLine = `\n\n🔗 Book karo: ${SITE_URL}/?utm_source=facebook&utm_medium=social&utm_campaign=auto_publish`;
const igLinkLine = `\n\n🔗 Booking link: bio me (${SITE_URL.replace(/^https?:\/\//, '')})`;

type StepResult = { ok: boolean; skipped?: boolean; detail?: any };

export async function GET(request: Request) {
  // Security secret check
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';

  try {
    // 1. Tracker
    const { data: tracker, error: trackerError } = await supabase
      .from('cron_tracker')
      .select('last_index')
      .eq('id', 1)
      .single();

    if (trackerError) throw trackerError;

    const currentIndex = tracker ? tracker.last_index : 0;

    // Active users count
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email')
      .eq('is_active', true);

    const fbPageId = cleanEnv(process.env.FB_PAGE_ID);
    const fbAccessToken = cleanEnv(process.env.FB_PAGE_ACCESS_TOKEN);
    const igUserId = cleanEnv(process.env.IG_USER_ID);
    const resendKey = process.env.RESEND_API_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const useGmail = !!(gmailUser && gmailPass);

    // DRY RUN: kuch bhejta nahi, sirf config dikhata hai
    if (dryRun) {
      console.log('[auto-publish] DRY', JSON.stringify({
        last_index: currentIndex,
        total_posts: campaigns.length,
        active_users: users?.length ?? 0,
        users_query_error: usersError?.message ?? null,
        env: {
          RESEND_API_KEY: !!resendKey,
          GMAIL_SMTP: useGmail,
          FB_PAGE_ID: !!fbPageId,
          FB_PAGE_ACCESS_TOKEN: !!fbAccessToken,
          IG_USER_ID: !!igUserId,
        },
      }));
      return NextResponse.json({
        dry_run: true,
        last_index: currentIndex,
        total_posts: campaigns.length,
        cycle_complete: currentIndex >= campaigns.length,
        next_post_title: campaigns[currentIndex]?.title ?? null,
        active_users: users?.length ?? 0,
        users_query_error: usersError?.message ?? null,
        env: {
          RESEND_API_KEY: !!resendKey,
          GMAIL_SMTP: useGmail,
          FB_PAGE_ID: !!fbPageId,
          FB_PAGE_ACCESS_TOKEN: !!fbAccessToken,
          IG_USER_ID: !!igUserId,
        },
      });
    }

    if (currentIndex >= campaigns.length) {
      return NextResponse.json({
        message: 'Cycle complete! cron_tracker.last_index reset karo ya campaigns.json update karo.',
        last_index: currentIndex,
        total_posts: campaigns.length,
      });
    }

    const currentPost = campaigns[currentIndex];
    const results: Record<string, StepResult> = {};

    // Dynamic poster (logo + title + brand colors).
    // If the poster cannot be generated: EMAIL still goes out, but Facebook/Instagram
    // are SKIPPED (never the old cheap campaigns.json image_url).
    const origin = new URL(request.url).origin;
    // Finished posters live in public/posters/01.jpg ... 30.jpg (served at /posters/NN.jpg)
    const posterUrl = `${origin}/posters/${String(currentPost.id).padStart(2, '0')}.jpg`;
    let imageUrl: string | null = null;
    let posterError = '';
    try {
      const pr = await fetch(posterUrl, { signal: AbortSignal.timeout(25000) });
      if (pr.ok && (pr.headers.get('content-type') || '').startsWith('image/')) {
        imageUrl = posterUrl;
      } else {
        posterError = `poster route status ${pr.status}`;
      }
    } catch (e: any) {
      posterError = e?.message || 'poster fetch failed';
    }
    if (!imageUrl) console.error('[auto-publish] POSTER FAILED', posterError);

    // 2. EMAIL (Resend) - 100-100 ke chunks.
    // Resend batch is all-or-nothing: ONE bad address (example.com, sub.example.com,
    // typo...) fails the whole 100. So: strong filter first, and if a chunk still
    // fails we resend that chunk one-by-one and only skip the bad addresses.
    if (!resendKey && !useGmail) {
      results.email = { ok: false, skipped: true, detail: 'GMAIL_USER/GMAIL_APP_PASSWORD ya RESEND_API_KEY set nahi hai' };
    } else if (usersError) {
      results.email = { ok: false, detail: `users query error: ${usersError.message}` };
    } else if (!users || users.length === 0) {
      results.email = { ok: false, skipped: true, detail: 'is_active=true wala koi user nahi' };
    } else {
      try {
        const blocked =
          /@([a-z0-9-]+\.)*(example\.(com|org|net|co|in)|test\.(com|org|net|in)|localhost|invalid|local)$/i;
        const seen = new Set<string>();
        const validUsers = users
          .map((u) => (typeof u.email === 'string' ? u.email.trim().toLowerCase() : ''))
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && !blocked.test(e))
          .filter((e) => (seen.has(e) ? false : (seen.add(e), true)))
          .map((email) => ({ email }));
        const skippedEmails = users.length - validUsers.length;
        if (validUsers.length === 0) throw new Error('Koi valid email nahi mili');

        if (useGmail) {
          // GMAIL MODE: Gmail SMTP (app password). Free limit ~500/day.
          // 3 parallel sends, har email alag (kisi ko doosron ke address nahi dikhte).
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            maxConnections: 3,
            auth: { user: gmailUser, pass: gmailPass },
          });
          const gFrom = process.env.MAIL_FROM || `ChalFirr <${gmailUser}>`;
          let gSent = 0;
          const gFailed: string[] = [];
          const gErrors = new Set<string>();
          for (let i = 0; i < validUsers.length; i += 3) {
            const group = validUsers.slice(i, i + 3);
            await Promise.all(
              group.map(async (u) => {
                try {
                  await transporter.sendMail({
                    from: gFrom,
                    to: u.email,
                    subject: currentPost.email_subject,
                    html: currentPost.email_html,
                  });
                  gSent += 1;
                } catch (err: any) {
                  gFailed.push(u.email);
                  gErrors.add(String(err?.message || err).slice(0, 200));
                }
              })
            );
          }
          transporter.close();
          if (gFailed.length) console.error('[auto-publish] gmail failed for', JSON.stringify(gFailed), JSON.stringify([...gErrors]));
          results.email =
            gSent > 0
              ? { ok: true, detail: `${gSent} users ko bheji (Gmail), ${skippedEmails} invalid/test skip, ${gFailed.length} reject${gErrors.size ? ' | reason: ' + [...gErrors].slice(0, 3).join(' || ') : ''}` }
              : { ok: false, detail: `Gmail se kisi ko nahi gayi | reason: ${[...gErrors].slice(0, 3).join(' || ')}` };
        } else {
          const resend = new Resend(resendKey as string);
          const from = process.env.MAIL_FROM || 'ChalFirr <onboarding@resend.dev>';
          const mk = (email: string) => ({
            from,
            to: email,
            subject: currentPost.email_subject,
            html: currentPost.email_html,
          });

          let sent = 0;
          const failed: string[] = [];
          const errorMsgs = new Set<string>();
          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
          for (let i = 0; i < validUsers.length; i += 100) {
            const chunk = validUsers.slice(i, i + 100);
            const { error } = await resend.batch.send(chunk.map((u) => mk(u.email)));
            if (!error) {
              sent += chunk.length;
              continue;
            }
            // Chunk rejected: send one-by-one (throttled: Resend allows ~2 requests/sec).
            console.error('[auto-publish] email batch rejected, retrying one-by-one', JSON.stringify(error));
            errorMsgs.add(`batch: ${error.message}`);
            for (const u of chunk) {
              let r = await resend.emails.send(mk(u.email));
              if (r.error && /rate|too many|429/i.test(`${r.error.name} ${r.error.message}`)) {
                await sleep(1500);
                r = await resend.emails.send(mk(u.email)); // one retry after rate limit
              }
              if (r.error) {
                failed.push(u.email);
                errorMsgs.add(`${r.error.name}: ${r.error.message}`);
              } else {
                sent += 1;
              }
              await sleep(600);
            }
          }
          if (failed.length) console.error('[auto-publish] email failed for', JSON.stringify(failed), JSON.stringify([...errorMsgs]));
          results.email =
            sent > 0
              ? { ok: true, detail: `${sent} users ko bheji, ${skippedEmails} invalid/test skip, ${failed.length} reject${failed.length ? ': ' + failed.join(', ') : ''}${errorMsgs.size ? ' | reason: ' + [...errorMsgs].slice(0, 3).join(' || ') : ''}` }
              : { ok: false, detail: `Kisi ko nahi gayi. Reject: ${failed.join(', ')} | reason: ${[...errorMsgs].slice(0, 3).join(' || ')}` };
        }
      } catch (e: any) {
        results.email = { ok: false, detail: e.message };
      }
    }

    // 3. FACEBOOK
    if (!imageUrl) {
      results.facebook = { ok: false, skipped: true, detail: `Poster nahi bana: ${posterError}` };
    } else if (!fbPageId || !fbAccessToken) {
      results.facebook = { ok: false, skipped: true, detail: 'FB_PAGE_ID ya FB_PAGE_ACCESS_TOKEN set nahi' };
    } else {
      try {
        // Same token (User ya Page) se Page token auto nikal lo; fail ho to original token chalega
        let pageToken = fbAccessToken;
        try {
          const ptRes = await fetch(
            `https://graph.facebook.com/v19.0/${fbPageId}?fields=access_token&access_token=${fbAccessToken}`
          );
          const ptData = await ptRes.json();
          if (ptData?.access_token) pageToken = ptData.access_token;
        } catch {}
        const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl,
            caption: currentPost.social_caption + fbLinkLine,
            access_token: pageToken,
          }),
        });
        const data = await res.json();
        results.facebook = res.ok && !data.error ? { ok: true, detail: data } : { ok: false, detail: data };
      } catch (e: any) {
        results.facebook = { ok: false, detail: e.message };
      }
    }

    // 4. INSTAGRAM
    if (!imageUrl) {
      results.instagram = { ok: false, skipped: true, detail: `Poster nahi bana: ${posterError}` };
    } else if (!igUserId || !fbAccessToken) {
      results.instagram = { ok: false, skipped: true, detail: 'IG_USER_ID ya FB_PAGE_ACCESS_TOKEN set nahi' };
    } else {
      try {
        const containerRes = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(
            imageUrl
          )}&caption=${encodeURIComponent(currentPost.social_caption + igLinkLine)}&access_token=${fbAccessToken}`,
          { method: 'POST' }
        );
        const containerData = await containerRes.json();

        if (!containerData.id) {
          results.instagram = { ok: false, detail: { step: 'create_container', ...containerData } };
        } else {
          // Container ready hone ka wait (max ~20 sec)
          let ready = false;
          for (let i = 0; i < 10; i++) {
            const statusRes = await fetch(
              `https://graph.facebook.com/v19.0/${containerData.id}?fields=status_code&access_token=${fbAccessToken}`
            );
            const statusData = await statusRes.json();
            if (statusData.status_code === 'FINISHED') {
              ready = true;
              break;
            }
            if (statusData.status_code === 'ERROR') break;
            await new Promise((r) => setTimeout(r, 2000));
          }

          if (!ready) {
            results.instagram = { ok: false, detail: { step: 'container_not_ready', id: containerData.id } };
          } else {
            const publishRes = await fetch(
              `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${containerData.id}&access_token=${fbAccessToken}`,
              { method: 'POST' }
            );
            const publishData = await publishRes.json();
            results.instagram =
              publishRes.ok && !publishData.error
                ? { ok: true, detail: publishData }
                : { ok: false, detail: { step: 'publish', ...publishData } };
          }
        }
      } catch (e: any) {
        results.instagram = { ok: false, detail: e.message };
      }
    }

    // 5. Tracker sirf tab aage badhao jab kam se kam ek channel chala ho
    const anySuccess = Object.values(results).some((r) => r.ok);
    if (anySuccess) {
      await supabase
        .from('cron_tracker')
        .update({
          last_index: currentIndex + 1,
          last_post_title: currentPost.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    }

    const finalBody = {
      success: anySuccess,
      published_index: currentIndex,
      title: currentPost.title,
      tracker_advanced: anySuccess,
      poster_used: imageUrl === posterUrl,
      poster_error: posterError || null,
      results,
    };
    console.log('[auto-publish] RESULT', JSON.stringify(finalBody));
    return NextResponse.json(finalBody);
  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
