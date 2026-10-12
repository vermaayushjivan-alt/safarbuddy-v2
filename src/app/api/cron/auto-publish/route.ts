import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import campaigns from '@/data/campaigns.json';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'Re_ZeHKZjxd_GYghU23G3DXixwoYPbiXUcZj');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

export async function GET(request: Request) {
  // Security secret check
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Current post index Supabase se padhein
    const { data: tracker, error: trackerError } = await supabase
      .from('cron_tracker')
      .select('last_index')
      .eq('id', 1)
      .single();

    if (trackerError) throw trackerError;

    const currentIndex = tracker ? tracker.last_index : 0;

    // Check agar 30 posts complete ho chuki hain
    if (currentIndex >= campaigns.length) {
      return NextResponse.json({
        message: '15-day cycle (30 posts) complete! Update src/data/campaigns.json to restart.',
      });
    }

    const currentPost = campaigns[currentIndex];

    // 2. Users ko Email send karna (Resend)
    const { data: users } = await supabase
      .from('users')
      .select('email')
      .eq('is_active', true);

    if (users && users.length > 0 && resend) {
      const emailBatch = users.map((u) => ({
        from: 'ChalFirr <updates@chalfirr.com>', // Agar domain setup nahi hai toh 'onboarding@resend.dev' use karein
        to: u.email,
        subject: currentPost.email_subject,
        html: currentPost.email_html,
      }));

      await resend.batch.send(emailBatch);
    }

    // 3. Facebook Page Post (Meta Graph API)
    const fbPageId = process.env.FB_PAGE_ID;
    const fbAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;

    if (fbPageId && fbAccessToken) {
      await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: currentPost.image_url,
          caption: currentPost.social_caption,
          access_token: fbAccessToken,
        }),
      });
    }

    // 4. Instagram Business Post (Meta Graph API)
    const igUserId = process.env.IG_USER_ID;
    if (igUserId && fbAccessToken) {
      // Step A: Container banayein
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(
          currentPost.image_url
        )}&caption=${encodeURIComponent(currentPost.social_caption)}&access_token=${fbAccessToken}`,
        { method: 'POST' }
      );
      const containerData = await containerRes.json();

      // Step B: Publish karein
      if (containerData.id) {
        await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${containerData.id}&access_token=${fbAccessToken}`,
          { method: 'POST' }
        );
      }
    }

    // 5. Supabase Tracker Update (Next post index set karo)
    await supabase
      .from('cron_tracker')
      .update({
        last_index: currentIndex + 1,
        last_post_title: currentPost.title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    return NextResponse.json({
      success: true,
      published_index: currentIndex,
      title: currentPost.title,
      next_index: currentIndex + 1,
    });
  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
