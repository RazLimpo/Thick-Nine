// app/api/admin/sub-admins/route.ts

import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants';
import { createSubAdminSchema } from '@/lib/schemas/subAdmin';

// 1. Target your exact frontend URL or use process.env NEXT_PUBLIC_SITE_URL
const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const corsHeaders = {
  'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function proxyToBackend(path: string, init: RequestInit) {
  const backendRes = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(12000), // 12 seconds
  });

  const body = await backendRes.json().catch(() => ({}));

  // Create response headers map
  const responseHeaders = new Headers(corsHeaders);
  
  // 2. Forward Set-Cookie from Express back to the client if present
  const setCookie = backendRes.headers.get('set-cookie');
  if (setCookie) {
    responseHeaders.set('Set-Cookie', setCookie);
  }

  if (!backendRes.ok) {
    return NextResponse.json(
      {
        success: false,
        message: body.message || `Backend responded with status ${backendRes.status}`,
        data: body,
      },
      {
        status: backendRes.status,
        headers: responseHeaders,
      }
    );
  }

  return NextResponse.json(body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PROXY GET /api/admin/sub-admins] Error:', err);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to reach backend (${API_BASE_URL}). ${message}`,
      },
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie') || '';

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Zod Runtime Validation
    const parseResult = createSubAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Proxy sanitized & transformed data (parseResult.data) to Express backend
    return await proxyToBackend('/api/admin/sub-admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(parseResult.data),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PROXY POST /api/admin/sub-admins] Error:', err);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to reach backend (${API_BASE_URL}). ${message}`,
      },
      { status: 502, headers: corsHeaders }
    );
  }
}