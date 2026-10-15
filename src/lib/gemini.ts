export async function generateSellerText(
  action: 'generate_description' | 'shop_bio' | 'job_description' | 'suggest_pricing',
  payload: {
    name?: string;
    title?: string;
    company?: string;
    category?: string;
    city?: string;
    type?: string;
    prompt?: string;
    roughNotes?: string;
  }
): Promise<string> {
  const title = payload.name || payload.title || 'NEWARO Listing';
  const category = payload.category || payload.type || 'General';
  try {
    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category,
        type:
          action === 'shop_bio'
            ? 'local storefront'
            : action === 'job_description'
            ? 'job or freelance gig'
            : 'social commerce post',
        keywords: payload.prompt || payload.company || payload.city || payload.roughNotes || '',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    }
  } catch (err) {
    console.warn('Gemini generateSellerText fallback:', err);
  }

  if (action === 'shop_bio') {
    return `${title} in ${payload.city || 'Nepal'} - offering authentic ${category} products with fast delivery and Cash on Delivery across Nepal.`;
  }
  if (action === 'job_description') {
    return `${title} at ${payload.company || 'our team'} (${category}). Message us directly on NEWARO with your experience and portfolio to apply.`;
  }
  return `${title} - now available on NEWARO! Message us for details or order with Cash on Delivery.`;
}

export async function generateListingContent(params: {
  title: string;
  category: string;
  type: 'product' | 'shop' | 'event' | 'job';
  keywords?: string;
}): Promise<string> {
  try {
    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      return data.text || '';
    }
  } catch (err) {
    console.error('AI helper error:', err);
  }
  return `Authentic ${params.title} in ${params.category}. Quality guaranteed with Cash on Delivery support across Nepal.`;
}
