export type EmailTemplateType =
  | 'welcome'
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'order_placed'
  | 'order_status'
  | 'product_update'
  | 'shop_approved'
  | 'system'
  | 'announcement'
  | 'weekly_insight'
  | 'alert_threshold';

export const ALLOWED_EMAIL_TYPES: EmailTemplateType[] = [
  'welcome',
  'like',
  'comment',
  'follow',
  'message',
  'order_placed',
  'order_status',
  'product_update',
  'shop_approved',
  'system',
  'announcement',
  'weekly_insight',
  'alert_threshold',
];

const BASE_DOMAIN = 'https://bishalshrestha17.com.np';
const SUPPORT_EMAIL = 'bishalxtha17@gmail.com';

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolveSafeLink(rawLink?: unknown): string {
  if (!rawLink || typeof rawLink !== 'string') return BASE_DOMAIN;
  const trimmed = rawLink.trim();
  if (!trimmed) return BASE_DOMAIN;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${BASE_DOMAIN}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'bishalshrestha17.com.np' ||
        parsed.hostname.endsWith('.bishalshrestha17.com.np') ||
        parsed.hostname.includes('run.app'))
    ) {
      return parsed.toString();
    }
  } catch {
    return BASE_DOMAIN;
  }
  return BASE_DOMAIN;
}

export function isValidHttpsUrl(rawUrl: unknown): boolean {
  if (rawUrl === undefined || rawUrl === null || rawUrl === '') return true;
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface LayoutOptions {
  preheader: string;
  badgeText: string;
  badgeColor?: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  heroImageUrl?: string;
}

function buildResponsiveLayout(opts: LayoutOptions): string {
  const preheader = escapeHtml(opts.preheader);
  const badgeText = escapeHtml(opts.badgeText);
  const badgeBg = opts.badgeColor || '#eff6ff';
  const badgeFg = opts.badgeColor ? '#ffffff' : '#2563eb';
  const heading = escapeHtml(opts.heading);
  const ctaLabel = escapeHtml(opts.ctaLabel);
  const ctaUrl = escapeHtml(opts.ctaUrl);
  const settingsUrl = `${BASE_DOMAIN}/settings`;

  const heroRow =
    opts.heroImageUrl && isValidHttpsUrl(opts.heroImageUrl)
      ? `<tr>
          <td style="padding: 0 32px 20px 32px;">
            <img src="${escapeHtml(opts.heroImageUrl)}" alt="" width="536" style="display:block; width:100%; max-width:536px; height:auto; border-radius:12px; border:1px solid #e2e8f0;" />
          </td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; width:100%; margin:0; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px 32px; border-bottom:1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="display:inline-block; background-color:#2563eb; color:#ffffff; font-weight:800; font-size:15px; letter-spacing:0.6px; padding:7px 14px; border-radius:8px;">NEWARO</span>
                    <span style="font-size:13px; color:#64748b; font-weight:600; margin-left:8px;">Nepal Social Commerce & Gigs</span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block; background-color:${badgeBg}; color:${badgeFg}; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; padding:5px 10px; border-radius:6px;">${badgeText}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px 32px;">
              <h1 style="margin:0; font-size:22px; line-height:1.35; font-weight:800; color:#0f172a;">${heading}</h1>
            </td>
          </tr>
          ${heroRow}
          <tr>
            <td style="padding:4px 32px 24px 32px; font-size:15px; line-height:1.65; color:#334155;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:0 32px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="border-radius:10px;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px; background-color:#2563eb;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; font-size:12px; line-height:1.6; color:#64748b;">
              <p style="margin:0 0 6px 0;">
                You received this email from <strong>NEWARO</strong>. Need help? Contact support at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb; text-decoration:none; font-weight:600;">${SUPPORT_EMAIL}</a>.
              </p>
              <p style="margin:0;">
                <a href="${settingsUrl}" target="_blank" style="color:#2563eb; text-decoration:underline; font-weight:600;">Manage notification settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailTemplate(
  type: EmailTemplateType,
  data: Record<string, any> = {}
): { subject: string; html: string; text: string } {
  const actorName = escapeHtml(data.actorName || data.name || 'NEWARO');
  const rawTitle = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '';
  const rawMessage = typeof data.message === 'string' && data.message.trim() ? data.message.trim() : '';
  const safeMessage = escapeHtml(rawMessage);
  const ctaUrl = resolveSafeLink(data.link);
  const photoUrl = typeof data.photoUrl === 'string' && isValidHttpsUrl(data.photoUrl) ? data.photoUrl.trim() : '';
  const settingsUrl = `${BASE_DOMAIN}/settings`;

  switch (type) {
    case 'weekly_insight': {
      const heading = rawTitle || 'Your NEWARO Weekly Freelancer & Contractor Performance Report';
      const bodyText =
        rawMessage ||
        'Your weekly performance review is ready: see your tracked revenue, completed milestones, client ratings, and custom goal metrics.';
      const bodyHtml = `
        <p style="margin:0 0 12px 0;">Namaste <strong>${actorName}</strong>,</p>
        <p style="margin:0 0 16px 0;">${safeMessage}</p>
        <div style="background-color:#f1f5f9; border-radius:12px; padding:16px; margin-bottom:16px;">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#64748b;">Weekly Tracked Revenue:</td>
              <td style="padding:6px 0; font-weight:700; text-align:right; color:#0f172a;">${data.weeklyEarnings || 'NPR 0'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#64748b;">Goal Completion:</td>
              <td style="padding:6px 0; font-weight:700; text-align:right; color:#16a34a;">${data.goalProgress || '100%'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#64748b;">Active Gigs / Contracts:</td>
              <td style="padding:6px 0; font-weight:700; text-align:right; color:#0f172a;">${data.activeGigsCount || '0'} active</td>
            </tr>
          </table>
        </div>
      `;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Weekly Insight',
          badgeColor: '#16a34a',
          heading,
          bodyHtml,
          ctaLabel: 'View Performance Dashboard',
          ctaUrl: resolveSafeLink('/jobs?tab=dashboard'),
        }),
        text: `${heading}\n\n${bodyText}\n\nDashboard: ${resolveSafeLink('/jobs?tab=dashboard')}`,
      };
    }
    case 'alert_threshold': {
      const heading = rawTitle || 'NEWARO Alert: Performance Threshold Triggered';
      const bodyText = rawMessage || 'One of your custom contractor/freelancer alert thresholds was triggered.';
      const bodyHtml = `
        <div style="padding:14px 16px; background-color:#fef2f2; border-left:4px solid #ef4444; border-radius:8px; margin-bottom:16px;">
          <strong style="color:#b91c1c;">Alert Triggered:</strong>
          <p style="margin:6px 0 0 0; color:#991b1b; font-size:14px;">${safeMessage}</p>
        </div>
        <p style="margin:0;">Take action now on your contractor performance dashboard to adjust targets or optimize current bids.</p>
      `;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Threshold Alert',
          badgeColor: '#dc2626',
          heading,
          bodyHtml,
          ctaLabel: 'Review Alert & Gigs',
          ctaUrl: resolveSafeLink('/jobs?tab=dashboard'),
        }),
        text: `${heading}\n\n${bodyText}\n\nReview: ${resolveSafeLink('/jobs?tab=dashboard')}`,
      };
    }
    case 'welcome': {
      const userName = escapeHtml(data.name || data.actorName || 'Member');
      const heading = rawTitle || `Welcome to NEWARO, ${data.name || 'Member'}!`;
      const bodyText =
        rawMessage ||
        'Your NEWARO account is active. Discover verified local shops across Nepal, explore freelance gigs & contractor opportunities, connect with clients, and shop with Cash on Delivery.';
      const bodyHtml = `<p style="margin:0 0 12px 0;">Hi <strong>${userName}</strong>,</p><p style="margin:0;">${escapeHtml(bodyText)}</p>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Welcome',
          heading,
          bodyHtml,
          ctaLabel: 'Explore NEWARO',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nExplore NEWARO: ${ctaUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'like': {
      const heading = rawTitle || `${data.actorName || 'Someone'} liked your post`;
      const bodyText = rawMessage || `${data.actorName || 'A community member'} liked your post on NEWARO.`;
      const bodyHtml = `<p style="margin:0;">${escapeHtml(bodyText)}</p>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'New Like',
          heading,
          bodyHtml,
          ctaLabel: 'View Post',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nView Post: ${ctaUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'comment': {
      const heading = rawTitle || `New comment from ${data.actorName || 'a member'}`;
      const bodyText = rawMessage || `${data.actorName || 'Someone'} commented on your post.`;
      const bodyHtml = `<p style="margin:0 0 12px 0;"><strong>${actorName}</strong> left a comment:</p>
        <div style="padding:14px 16px; background-color:#f8fafc; border-left:4px solid #2563eb; border-radius:8px; color:#1e293b;">
          ${escapeHtml(bodyText)}
        </div>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Comment',
          heading,
          bodyHtml,
          ctaLabel: 'View Comment',
          ctaUrl,
        }),
        text: `${heading}\n\n"${bodyText}"\n\nView Comment: ${ctaUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'follow': {
      const heading = rawTitle || `${data.actorName || 'Someone'} started following you`;
      const bodyText = rawMessage || `${data.actorName || 'A NEWARO member'} is now following your profile and updates.`;
      const bodyHtml = `<p style="margin:0;">${escapeHtml(bodyText)}</p>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'New Follower',
          heading,
          bodyHtml,
          ctaLabel: 'View Profile',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nView Profile: ${ctaUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'message': {
      const heading = rawTitle || `New message from ${data.actorName || 'a user'}`;
      const bodyText = rawMessage || `You received a new direct message on NEWARO.`;
      const bodyHtml = `<p style="margin:0 0 12px 0;"><strong>${actorName}</strong> sent you a message:</p>
        <div style="padding:14px 16px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; color:#1e293b;">
          ${escapeHtml(bodyText)}
        </div>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Direct Message',
          heading,
          bodyHtml,
          ctaLabel: 'Reply in Messages',
          ctaUrl: ctaUrl === BASE_DOMAIN ? `${BASE_DOMAIN}/chat` : ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nReply in Messages: ${ctaUrl === BASE_DOMAIN ? `${BASE_DOMAIN}/chat` : ctaUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'order_placed': {
      const orderId = escapeHtml(String(data.orderId || 'NEW').slice(0, 12));
      const shopName = escapeHtml(data.shopName || 'NEWARO Store');
      const total = Number(data.total || 0);
      const items = Array.isArray(data.items) ? data.items.slice(0, 20) : [];
      const heading = rawTitle || `Order #${orderId} Confirmed`;
      const itemsRowsHtml =
        items.length > 0
          ? items
              .map((item: any) => {
                const iName = escapeHtml(item?.name || 'Item');
                const iQty = Math.max(1, Number(item?.quantity || 1));
                const iPrice = Number(item?.price || 0) * iQty;
                return `<tr>
                  <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#1e293b; font-size:14px;">${iName} &times; ${iQty}</td>
                  <td align="right" style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:600; font-size:14px;">NPR ${iPrice.toLocaleString()}</td>
                </tr>`;
              })
              .join('')
          : `<tr><td colspan="2" style="padding:8px 0; color:#475569; font-size:14px;">${safeMessage || 'Cash on Delivery order items'}</td></tr>`;
      const bodyHtml = `
        <p style="margin:0 0 14px 0;">Your Cash on Delivery order with <strong>${shopName}</strong> has been placed.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px;">
          ${itemsRowsHtml}
          <tr>
            <td style="padding-top:12px; font-weight:800; color:#0f172a; font-size:15px;">Total (Cash on Delivery)</td>
            <td align="right" style="padding-top:12px; font-weight:800; color:#2563eb; font-size:16px;">NPR ${total.toLocaleString()}</td>
          </tr>
        </table>
        ${data.shippingAddress ? `<p style="margin:8px 0 0 0; font-size:13px; color:#64748b;">Delivery Address: ${escapeHtml(data.shippingAddress)}</p>` : ''}
      `;
      const trackUrl = ctaUrl === BASE_DOMAIN ? `${BASE_DOMAIN}/orders` : ctaUrl;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: `Order #${orderId} placed · Total NPR ${total.toLocaleString()}`,
          badgeText: 'Order Placed',
          badgeColor: '#16a34a',
          heading,
          bodyHtml,
          ctaLabel: 'Track your order',
          ctaUrl: trackUrl,
        }),
        text: `${heading}\n\nStore: ${data.shopName || 'NEWARO Store'}\nTotal (COD): NPR ${total.toLocaleString()}\n\nTrack your order: ${trackUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'order_status': {
      const orderId = escapeHtml(String(data.orderId || 'ORD').slice(0, 12));
      const rawStatus = String(data.status || 'confirmed').toLowerCase();
      const steps = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
      const activeIdx =
        rawStatus.includes('deliver')
          ? 3
          : rawStatus.includes('ship') || rawStatus.includes('out')
          ? 2
          : rawStatus.includes('confirm') || rawStatus.includes('process')
          ? 1
          : 0;
      const heading = rawTitle || `Order #${orderId} is ${steps[activeIdx]}`;
      const noteText = rawMessage || data.note || `Your order status has been updated to ${steps[activeIdx]}.`;
      const trackUrl = ctaUrl === BASE_DOMAIN ? `${BASE_DOMAIN}/orders` : ctaUrl;
      const bodyHtml = `<p style="margin:0 0 16px 0;">${escapeHtml(noteText)}</p>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: noteText,
          badgeText: steps[activeIdx],
          heading,
          bodyHtml,
          ctaLabel: 'Track your order',
          ctaUrl: trackUrl,
        }),
        text: `${heading}\n\n${noteText}\n\nTrack your order: ${trackUrl}\n\nManage notification settings: ${settingsUrl}\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'product_update': {
      const productName = escapeHtml(data.productName || data.title || 'Featured Product');
      const price = data.price !== undefined ? `NPR ${Number(data.price).toLocaleString()}` : '';
      const heading = rawTitle || `Product Update: ${data.productName || data.title || 'New Arrival'}`;
      const bodyHtml = `<p style="margin:0 0 12px 0;">${safeMessage || `Check out the latest update on <strong>${productName}</strong>.`}</p>`;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: `${data.productName || 'Product'} ${price}`,
          badgeText: 'Product Update',
          heading,
          bodyHtml,
          ctaLabel: 'View product',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\nPrice: ${price}\nView product: ${ctaUrl}\n\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'shop_approved': {
      const shopName = escapeHtml(data.shopName || 'Your Store');
      const heading = rawTitle || `Your Shop "${data.shopName || 'Store'}" is Approved!`;
      const bodyText =
        rawMessage ||
        `Congratulations! Your store "${data.shopName || 'Store'}" is now verified and live on NEWARO. You can now publish products and accept Cash on Delivery orders.`;
      const dashUrl = ctaUrl === BASE_DOMAIN ? `${BASE_DOMAIN}/shop-dashboard` : ctaUrl;
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Shop Approved',
          badgeColor: '#16a34a',
          heading,
          bodyHtml: `<p style="margin:0 0 10px 0;">Store: <strong>${shopName}</strong></p><p style="margin:0;">${escapeHtml(bodyText)}</p>`,
          ctaLabel: 'Open Shop Dashboard',
          ctaUrl: dashUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nOpen Shop Dashboard: ${dashUrl}\n\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'announcement': {
      const heading = rawTitle || 'NEWARO Community Announcement';
      const bodyText = rawMessage || 'Here is an important update from the NEWARO team.';
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'Announcement',
          badgeColor: '#2563eb',
          heading,
          bodyHtml: `<p style="margin:0;">${escapeHtml(bodyText)}</p>`,
          ctaLabel: data.ctaText ? String(data.ctaText).slice(0, 32) : 'Open NEWARO',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nOpen NEWARO: ${ctaUrl}\n\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
    case 'system':
    default: {
      const heading = rawTitle || 'NEWARO Notification';
      const bodyText = rawMessage || 'You have a new account notification on NEWARO.';
      return {
        subject: heading,
        html: buildResponsiveLayout({
          preheader: bodyText,
          badgeText: 'System Notice',
          heading,
          bodyHtml: `<p style="margin:0;">${escapeHtml(bodyText)}</p>`,
          ctaLabel: 'Open NEWARO',
          ctaUrl,
          heroImageUrl: photoUrl,
        }),
        text: `${heading}\n\n${bodyText}\n\nOpen NEWARO: ${ctaUrl}\n\nSupport: ${SUPPORT_EMAIL}`,
      };
    }
  }
}
