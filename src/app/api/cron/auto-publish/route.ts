import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import campaigns from '@/data/campaigns.json';
import { Resend } from 'resend';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const fbPageId = process.env.FB_PAGE_ID;
    const fbAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    const igUserId = process.env.IG_USER_ID;
    const resendKey = process.env.RESEND_API_KEY;

    // DRY RUN: kuch bhejta nahi, sirf config dikhata hai
    if (dryRun) {
      console.log('[auto-publish] DRY', JSON.stringify({
        last_index: currentIndex,
        total_posts: campaigns.length,
        active_users: users?.length ?? 0,
        users_query_error: usersError?.message ?? null,
        env: {
          RESEND_API_KEY: !!resendKey,
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

    // 2. EMAIL (Resend) - 100-100 ke chunks
    if (!resendKey) {
      results.email = { ok: false, skipped: true, detail: 'RESEND_API_KEY set nahi hai' };
    } else if (usersError) {
      results.email = { ok: false, detail: `users query error: ${usersError.message}` };
    } else if (!users || users.length === 0) {
      results.email = { ok: false, skipped: true, detail: 'is_active=true wala koi user nahi' };
    } else {
      try {
        const resend = new Resend(resendKey);
        // Fake/test emails (example.com etc.) Resend ko reject karwa dete hain aur poora batch fail ho jata hai
        const blocked = /@(example\.(com|org|net)|test\.com|localhost|invalid)$/i;
        const validUsers = users.filter(
          (u) => typeof u.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) && !blocked.test(u.email)
        );
        const skippedEmails = users.length - validUsers.length;
        if (validUsers.length === 0) throw new Error('Koi valid email nahi mili');
        const batch = validUsers.map((u) => ({
          from: 'ChalFirr <updates@chalfirr.com>',
          to: u.email,
          subject: currentPost.email_subject,
          html: currentPost.email_html,
        }));
        const errors: any[] = [];
        for (let i = 0; i < batch.length; i += 100) {
          const { error } = await resend.batch.send(batch.slice(i, i + 100));
          if (error) errors.push(error);
        }
        results.email =
          errors.length === 0
            ? { ok: true, detail: `${validUsers.length} users ko bheji, ${skippedEmails} invalid/test email skip` }
            : { ok: false, detail: errors };
      } catch (e: any) {
        results.email = { ok: false, detail: e.message };
      }
    }

    // 3. FACEBOOK
    if (!fbPageId || !fbAccessToken) {
      results.facebook = { ok: false, skipped: true, detail: 'FB_PAGE_ID ya FB_PAGE_ACCESS_TOKEN set nahi' };
    } else {
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: currentPost.image_url,
            caption: currentPost.social_caption,
            access_token: fbAccessToken,
          }),
        });
        const data = await res.json();
        results.facebook = res.ok && !data.error ? { ok: true, detail: data } : { ok: false, detail: data };
      } catch (e: any) {
        results.facebook = { ok: false, detail: e.message };
      }
    }

    // 4. INSTAGRAM
    if (!igUserId || !fbAccessToken) {
      results.instagram = { ok: false, skipped: true, detail: 'IG_USER_ID ya FB_PAGE_ACCESS_TOKEN set nahi' };
    } else {
      try {
        const containerRes = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(
            currentPost.image_url
          )}&caption=${encodeURIComponent(currentPost.social_caption)}&access_token=${fbAccessToken}`,
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
      results,
    };
    console.log('[auto-publish] RESULT', JSON.stringify(finalBody));
    return NextResponse.json(finalBody);
  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
