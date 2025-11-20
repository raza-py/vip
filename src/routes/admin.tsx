import { Hono } from 'hono';
import { AdminDashboard } from '../components/AdminDashboard';
import { getAllUsers, createUser, updateUser, deleteUser } from '../db/queries';
import { Env } from '../index';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const adminRouter = new Hono<{ Bindings: Env }>();

// Dummy auth for now - replace with real session management
adminRouter.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${c.env.ADMIN_SECRET}`) {
        return c.text('Unauthorized', 401);
    }
    await next();
});

adminRouter.get('/', async (c) => {
    const db = c.get('db') as DrizzleD1Database;
    const users = await getAllUsers(db);
    return c.html(<AdminDashboard users={users} />);
});

const userSchema = z.object({
    uuid: z.string().uuid(),
    expirationDate: z.string(),
    expirationTime: z.string(),
    notes: z.string().optional(),
    trafficLimit: z.number().optional(),
    ipLimit: z.number().optional(),
});

adminRouter.post('/users', zValidator('json', userSchema), async (c) => {
    const user = c.req.valid('json');
    const db = c.get('db') as DrizzleD1Database;
    await createUser(db, user);
    return c.json({ success: true });
});

adminRouter.put('/users/:uuid', zValidator('json', userSchema.partial()), async (c) => {
    const uuid = c.req.param('uuid');
    const user = c.req.valid('json');
    const db = c.get('db') as DrizzleD1Database;
    await updateUser(db, uuid, user);
    return c.json({ success: true });
});

adminRouter.delete('/users/:uuid', async (c) => {
    const uuid = c.req.param('uuid');
    const db = c.get('db') as DrizzleD1Database;
    await deleteUser(db, uuid);
    return c.json({ success: true });
});

export { adminRouter };
