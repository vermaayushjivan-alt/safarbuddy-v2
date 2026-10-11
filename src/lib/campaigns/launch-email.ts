// ROOT PATH: src/lib/campaigns/launch-email.ts
// LAUNCH-MAIL-01 — the Navratri launch announcement (one-off campaign).
// Pure function: returns subject + HTML. Table layout and inline styles on
// purpose, so it renders the same in Gmail, Outlook and phone mail apps.

export const LAUNCH_CAMPAIGN_ID = "launch-navratri-2026";

export const LAUNCH_EMAIL_SUBJECT =
  "\u{1F64F} शुभ नवरात्रि! Chalfirr अब LIVE है";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLaunchEmailHtml(input: {
  siteUrl: string;
  fullName?: string | null;
}): string {
  const site = input.siteUrl.replace(/\/+$/, "");
  const firstName = (input.fullName ?? "").trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `नमस्ते ${escapeHtml(firstName)},` : "नमस्ते,";

  return `<!DOCTYPE html>
<html lang="hi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>शुभ नवरात्रि! Chalfirr अब LIVE है</title>
<style>
  body { margin:0; padding:0; background:#f2f6fb; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; }
  a { color:#1b5fcf; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:34px !important; line-height:42px !important; }
    .stack { display:block !important; width:100% !important; }
    .btn a { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f2f6fb;">

<!-- Preheader (inbox preview text) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f2f6fb;font-size:1px;line-height:1px;">
  आपकी हर यात्रा, अब और आसान — Hotels, Homestays और Tour Packages एक ही जगह।
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f6fb">
<tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

    <!-- Logo bar -->
    <tr>
      <td align="center" bgcolor="#fbf9f4" style="padding:18px 20px;border-radius:16px 16px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle" style="padding-right:12px;">
              <img src="${site}/icon-512-2.png" width="52" height="52" alt="Chalfirr" style="display:block;width:52px;height:52px;border-radius:26px;">
            </td>
            <td valign="middle" style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:30px;font-weight:700;letter-spacing:-0.5px;">
              <span style="color:#0b2f5c;">Chal</span><span style="color:#ff6a2b;">firr</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Hero -->
    <tr>
      <td align="center" bgcolor="#0b2f5c" class="px" style="padding:36px 32px 34px 32px;background-color:#0b2f5c;background-image:linear-gradient(180deg,#123a70 0%,#0b2f5c 55%,#0b1b33 100%);">
        <div style="font-size:22px;line-height:28px;letter-spacing:6px;color:#f2b705;">&#9679; &#9679; &#9679; &#9679; &#9679;</div>
        <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:3px;color:#ffd77a;font-weight:700;margin-top:14px;">LAUNCH SPECIAL</div>
        <h1 class="h1" style="margin:10px 0 0 0;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:42px;line-height:52px;color:#ffd75a;font-weight:800;">शुभ नवरात्रि</h1>
        <div style="margin-top:8px;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:17px;line-height:26px;color:#ffe2aa;">माँ दुर्गा के आशीर्वाद के साथ</div>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:22px;">
          <tr>
            <td align="center" bgcolor="#ff6a2b" style="border-radius:30px;padding:12px 26px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#ffffff;">
              Chalfirr is now LIVE!
            </td>
          </tr>
        </table>

        <div style="margin-top:20px;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:21px;line-height:30px;color:#ffffff;font-weight:700;">आपकी हर यात्रा, अब और आसान</div>
        <div style="margin-top:22px;font-size:22px;line-height:28px;letter-spacing:6px;color:#f2b705;">&#9679; &#9679; &#9679; &#9679; &#9679;</div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td bgcolor="#ffffff" class="px" style="padding:32px 36px 8px 36px;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:16px;line-height:26px;color:#0b1b33;">
        <p style="margin:0 0 14px 0;"><strong>${greeting}</strong></p>
        <p style="margin:0 0 14px 0;">आप Chalfirr के शुरुआती यूज़र्स में से हैं, इसलिए सबसे पहले आपको बताते हुए हमें खुशी है कि नवरात्रि के पावन अवसर पर आज हम आधिकारिक रूप से <strong>launch</strong> हो गए हैं।</p>
        <p style="margin:0 0 6px 0;">अब आप एक ही जगह से अपनी अगली यात्रा की planning और booking कर सकते हैं:</p>
      </td>
    </tr>

    <!-- Feature cards -->
    <tr>
      <td bgcolor="#ffffff" class="px" style="padding:6px 36px 6px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="#f2f6fb" style="border-radius:12px;padding:16px 18px;border-left:5px solid #ff6a2b;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <div style="font-size:17px;font-weight:700;color:#0b2f5c;">&#127976; Hotels</div>
              <div style="font-size:14px;line-height:21px;color:#41546f;margin-top:3px;">आपके बजट और शहर के हिसाब से सही hotel चुनें।</div>
            </td>
          </tr>
          <tr><td height="10" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#f2f6fb" style="border-radius:12px;padding:16px 18px;border-left:5px solid #f2b705;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <div style="font-size:17px;font-weight:700;color:#0b2f5c;">&#127969; Homestays</div>
              <div style="font-size:14px;line-height:21px;color:#41546f;margin-top:3px;">घर जैसा आराम, लोकल लोगों के साथ।</div>
            </td>
          </tr>
          <tr><td height="10" style="font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#f2f6fb" style="border-radius:12px;padding:16px 18px;border-left:5px solid #1b5fcf;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <div style="font-size:17px;font-weight:700;color:#0b2f5c;">&#127796; Tour Packages</div>
              <div style="font-size:14px;line-height:21px;color:#41546f;margin-top:3px;">घूमने-फिरने के तैयार packages, बिना किसी झंझट के।</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td align="center" bgcolor="#ffffff" class="px" style="padding:28px 36px 12px 36px;">
        <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;">
          <tr>
            <td align="center" bgcolor="#ff6a2b" style="border-radius:12px;">
              <a href="${site}/hotels" target="_blank" style="display:block;padding:16px 28px;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">अभी बुक करें &rarr;</a>
            </td>
          </tr>
        </table>
        <div style="margin-top:14px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#6b7c93;">&#128274; Payments Cashfree के secure gateway से होते हैं।</div>
      </td>
    </tr>

    <!-- Feedback -->
    <tr>
      <td bgcolor="#ffffff" class="px" style="padding:20px 36px 32px 36px;font-family:'Segoe UI','Noto Sans Devanagari',Mangal,Arial,sans-serif;font-size:15px;line-height:24px;color:#0b1b33;border-radius:0 0 16px 16px;">
        <p style="margin:0 0 10px 0;">आपका feedback हमारे लिए बहुत कीमती है। कुछ भी सुझाव या दिक्कत हो तो इस email का सीधे reply कर दें।</p>
        <p style="margin:0;">आपकी यात्रा शुभ हो! &#128591;<br><strong style="color:#0b2f5c;">टीम Chalfirr</strong></p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" class="px" style="padding:22px 24px 8px 24px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#6b7c93;">
        <div>&#128222; <a href="tel:+917307493338" style="color:#0b2f5c;text-decoration:none;">+91 73074 93338</a> &nbsp;|&nbsp; &#9993; <a href="mailto:safarbuddytravel@gmail.com" style="color:#0b2f5c;text-decoration:none;">safarbuddytravel@gmail.com</a></div>
        <div style="margin-top:10px;">आपको यह email इसलिए मिला क्योंकि आपने Chalfirr पर account बनाया है।<br>अगर आप ऐसे emails नहीं चाहते, तो बस reply में &ldquo;STOP&rdquo; लिख दें।</div>
        <div style="margin-top:10px;">&copy; Chalfirr</div>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>
`;
}
