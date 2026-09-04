// app/api/admin/sub-admins/route.ts


import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants';

// Handle preflight CORS checks
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    },
  });
}

async function proxyToBackend(path: string, init: RequestInit) {
  const backendRes = await fetch(`${API_BASE_URL}${path}`, init);
  
  // Parse JSON response, falling back to empty object on parse failure
  const body = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(
      {
        success: false,
        message: body.message || `Backend responded with status ${backendRes.status}`,
        data: body,
      },
      { status: backendRes.status }
    );
  }

  return NextResponse.json(body, { status: backendRes.status });
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie') || '';

    return await proxyToBackend('/api/admin/sub-admins', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PROXY GET /api/admin/sub-admins] Error:', err);
    return NextResponse.json(
      { success: false, message: `Failed to reach backend (${API_BASE_URL}). ${message}` },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie') || '';
    const body = await req.json().catch(() => ({}));

    return await proxyToBackend('/api/admin/sub-admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PROXY POST /api/admin/sub-admins] Error:', err);
    return NextResponse.json(
      { success: false, message: `Failed to reach backend (${API_BASE_URL}). ${message}` },
      { status: 502 }
    );
  }
}