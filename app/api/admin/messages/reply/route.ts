import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();

    const backendRes = await fetch(`${API_BASE_URL}/api/admin/messages/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit reply' },
      { status: 500 }
    );
  }
}