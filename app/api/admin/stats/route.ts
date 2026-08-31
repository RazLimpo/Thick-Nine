import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');

    console.log(`[PROXY /api/admin/stats] Forwarding request to: ${API_BASE_URL}/api/admin/stats`);

    const backendRes = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      signal: AbortSignal.timeout(8000), // Prevent hanging
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      console.error(`[PROXY /api/admin/stats] Backend returned HTTP ${backendRes.status}:`, data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || `Backend responded with status ${backendRes.status}` 
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[PROXY /api/admin/stats] Network/Proxy failure:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to reach backend service (${API_BASE_URL}). ${error.message}` 
      },
      { status: 502 }
    );
  }
}