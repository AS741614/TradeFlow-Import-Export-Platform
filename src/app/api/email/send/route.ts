import { NextResponse } from 'next/server';
import { runCampaignSimulation } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const campaignId = body.campaignId;

    if (typeof campaignId !== 'string' || !campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
    }

    // Run campaign simulation / trigger delivery simulation
    // This updates the local storage campaign states on the client browser.
    // In a real production deployment, this would use:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // and queue the actual transmissions.
    void runCampaignSimulation(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign dispatched successfully',
      campaignId,
    });
  } catch (error: unknown) {
    console.error('Email API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
