import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { runCampaignSimulation } from '@/lib/email';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    await throwIfNotAuthenticated();
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
      data: {
        success: true,
        message: 'Campaign dispatched successfully',
        campaignId,
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
