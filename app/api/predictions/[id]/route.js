import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Prevent Next.js / Vercel from caching responses
// See https://github.com/replicate/replicate-javascript/issues/136#issuecomment-1728053102
replicate.fetch = (url, options) => {
  return fetch(url, { cache: "no-store", ...options });
};

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

export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const prediction = await replicate.predictions.get(id);

    if (prediction?.error) {
      console.error(
        `[api/predictions/${id}] replicate returned error`,
        prediction.error
      );
      return NextResponse.json(
        { detail: errorDetail(prediction.error) },
        { status: 500 }
      );
    }

    return NextResponse.json(prediction);
  } catch (err) {
    console.error(`[api/predictions/${id}] replicate.predictions.get failed`, err);
    return NextResponse.json({ detail: errorDetail(err) }, { status: 500 });
  }
}