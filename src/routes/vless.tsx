import { Hono } from 'hono';
import { UserPanel } from '../components/UserPanel';
import { getUserByUuid } from '../db/queries';
import { parseVlessHeaderWithWasm } from '../vless/utils';
import { connect } from 'cloudflare:sockets';
import { Env } from '../index';
import { Analytics } from '../utils/analytics';
import { DrizzleD1Database } from 'drizzle-orm/d1';

const vlessRouter = new Hono<{ Bindings: Env }>();

vlessRouter.get('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    const db = c.get('db') as DrizzleD1Database;
    const analytics = c.get('analytics') as Analytics;

    try {
        const user = await getUserByUuid(db, uuid);
        if (!user) {
            return c.text('User not found', 404);
        }
        analytics.track('user_panel_visit', { uuid });
        return c.html(<UserPanel user={user} />);
    } catch (e) {
        console.error('Error fetching user for panel:', e);
        analytics.error({ message: 'User panel fetch failed', error: e });
        return c.text('Internal Server Error', 500);
    }
});

vlessRouter.get('/', async (c) => {
    if (c.req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        const { readable, writable } = new WebSocketPair();
        const webSocket = readable;
        const serverSocket = writable;

        serverSocket.accept();

        const db = c.get('db') as DrizzleD1Database;
        const analytics = c.get('analytics') as Analytics;
        const clientIp = c.req.header('cf-connecting-ip') || 'unknown';
        let sessionUsage = 0;

        const updateUsage = async (uuid: string) => {
            if (sessionUsage > 0) {
                try {
                    await db.update(schema.users)
                        .set({ trafficUsed: sql`${schema.users.trafficUsed} + ${sessionUsage}` })
                        .where(eq(schema.users.uuid, uuid));
                    sessionUsage = 0;
                } catch (dbError) {
                    console.error('Failed to update usage in DB:', dbError);
                    analytics.error({ message: 'DB usage update failed', error: dbError });
                }
            }
        };

        serverSocket.addEventListener('message', async (event) => {
            try {
                const data = new Uint8Array(event.data as ArrayBuffer);
                const header = await parseVlessHeaderWithWasm(data);
                const user = await getUserByUuid(db, header.uuid);

                if (!user) {
                    throw new Error('Invalid user');
                }

                // FIX: Error 1101 - Use waitUntil for non-blocking DB writes
                c.executionCtx.waitUntil(updateUsage(user.uuid));

                const remoteSocket = connect({ hostname: header.address, port: header.port });
                
                const readableStream = new ReadableStream({
                    start(controller) {
                        remoteSocket.readable.pipeTo(new WritableStream({
                            write(chunk) {
                                sessionUsage += chunk.byteLength;
                                serverSocket.send(chunk);
                            },
                            close() {
                                serverSocket.close();
                            }
                        }));
                    }
                });

                const writableStream = new WritableStream({
                    write(chunk) {
                        remoteSocket.writable.getWriter().write(chunk);
                    }
                });

                const initialPacket = data.slice(header.raw_data_index);
                const writer = writableStream.getWriter();
                await writer.write(initialPacket);
                writer.releaseLock();

            } catch (e) {
                console.error('WebSocket Error:', e);
                analytics.error({ message: 'VLESS WebSocket processing failed', error: e });
                serverSocket.close(1011, 'Processing error');
            }
        });

        serverSocket.addEventListener('close', (event) => {
            // Final usage update on close
            // c.executionCtx.waitUntil(updateUsage(user.uuid)); // Need user context here
            console.log('WebSocket closed', event.code, event.reason);
        });

        return new Response(null, { status: 101, webSocket: writable });
    }
    
    // If not a WebSocket request, show a generic page
    return c.text('Welcome to the VLESS proxy.');
});

export { vlessRouter };
