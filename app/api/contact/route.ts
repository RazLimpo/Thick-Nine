import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${API_BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send message.' },
      { status: 500 }
    );
  }
}