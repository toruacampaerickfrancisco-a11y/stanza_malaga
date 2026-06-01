import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { users, equipment, tickets } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';

const REPORTS_JSON = path.resolve(process.cwd(), 'data', 'reports.json');

export async function POST(req: Request) {
  try {
    if (!fs.existsSync(REPORTS_JSON)) {
      return NextResponse.json({ error: 'reports.json not found' }, { status: 404 });
    }

    const raw = fs.readFileSync(REPORTS_JSON, 'utf8');
    const reports = JSON.parse(raw);

    const created = [];
    for (const r of reports) {
      // Ensure equipment exists
      const equipmentRow = await db.select().from(equipment).where(eq(equipment.id, String(r.equipmentId))).limit(1);
      if (!equipmentRow || equipmentRow.length === 0) {
        const eqId = String(r.equipmentId);
        await db.insert(equipment).values({ id: eqId, type: 'unknown', brand: '', model: '', serial: '' });
      }

      // Ensure user exists (use reportedByUserId as id if possible)
      const userId = r.reportedByUserId ? String(r.reportedByUserId) : `user_${Math.random().toString(36).slice(2,8)}`;
      const userRow = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!userRow || userRow.length === 0) {
        await db.insert(users).values({ id: userId, name: `User ${userId}`, email: `${userId}@example.local`, passwordHash: 'noop', department: '' });
      }

      // Insert ticket if not exists (use id from reports.json)
      const ticketId = String(r.id);
      const ticketRow = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      if (!ticketRow || ticketRow.length === 0) {
        await db.insert(tickets).values({
          id: ticketId,
          userId: userId,
          equipmentId: String(r.equipmentId),
          serviceType: r.serviceType || 'social',
          observations: r.description || r.observations || '',
          status: (r.status === 'in-progress' || r.status === 'confirmado') ? 'confirmado' : (r.status === 'closed' || r.status === 'realizado' ? 'realizado' : 'solicitado'),
          diagnostic: r.diagnostic || null,
          repair: r.repair || null,
          parts: r.parts || null,
          createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
        });
        created.push(ticketId);
      }
    }

    return NextResponse.json({ restored: created.length, restoredIds: created });
  } catch (err) {
    console.error('Restore error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
