import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Prevent Next.js / Vercel from caching responses
// See https://github.com/replicate/replicate-javascript/issues/136#issuecomment-1728053102
replicate.fetch = (url, options) => {
  return fetch(url, { ...options, cache: "no-store" });
};

// In production and preview deployments (on Vercel), the VERCEL_URL environment variable is set.
// In development (on your local machine), the NGROK_HOST environment variable is set.
const WEBHOOK_HOST = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NGROK_HOST;

function errorDetail(err) {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err && err.message) {
    return String(err.message);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('[api/predictions] REPLICATE_API_TOKEN is not set');
    return NextResponse.json(
      {
        detail:
          'REPLICATE_API_TOKEN is not set. Add it to .env.local and restart the dev server.',
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.error('[api/predictions] invalid JSON body', e);
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, images } = body ?? {};

  const options = {
    model: 'google/nano-banana',
    input: {
      prompt,
      image_input: images,
    },
  };

  if (WEBHOOK_HOST) {
    options.webhook = `${WEBHOOK_HOST}/api/webhooks`;
    options.webhook_events_filter = ['start', 'completed'];
  }

  try {
    const prediction = await replicate.predictions.create(options);

    if (prediction?.error) {
      console.error('[api/predictions] replicate returned error on create', prediction.error);
      return NextResponse.json(
        { detail: errorDetail(prediction.error) },
        { status: 500 }
      );
    }

    console.log(
      `[api/predictions] created prediction id=${prediction?.id ?? '?'} status=${prediction?.status ?? '?'}`
    );
    return NextResponse.json(prediction, { status: 201 });
  } catch (err) {
    console.error('[api/predictions] replicate.predictions.create failed', err);
    return NextResponse.json({ detail: errorDetail(err) }, { status: 500 });
  }
}