import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';

function getAdminApp() {
  const apps = getApps();
  if (apps.length > 0) return apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured');
  }

  return initializeApp({
    credential: cert(JSON.parse(serviceAccountJson) as ServiceAccount),
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const idToken = authorization.slice('Bearer '.length).trim();

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      userId?: string;
      orgId?: string;
      role?: string;
    } | null;

    if (!body?.userId || !body?.orgId || !body?.role) {
      return NextResponse.json({ error: 'userId, orgId, and role are required' }, { status: 400 });
    }

    if (body.role !== 'owner' && body.role !== 'employee') {
      return NextResponse.json({ error: 'role must be owner or employee' }, { status: 400 });
    }

    if (decodedToken.uid !== body.userId && decodedToken.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot sync claims for another user' }, { status: 403 });
    }

    await auth.setCustomUserClaims(body.userId, { orgId: body.orgId, role: body.role });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
