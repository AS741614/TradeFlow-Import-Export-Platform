import { NextResponse } from 'next/server';
import { runCampaignSimulation } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    // Run campaign simulation / trigger delivery simulation
    // This updates the local storage campaign states on the client browser.
    // In a real production deployment, this would use:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // and queue the actual transmissions.
    runCampaignSimulation(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign dispatched successfully',
      campaignId,
    });
  } catch (error: any) {
    console.error('Email API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
