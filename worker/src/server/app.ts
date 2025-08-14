import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from '../types';

export type App = Hono<{ Bindings: Env; Variables: { userId?: string; sessionId?: string } }>; 

export function createApp(): App {
	const app: App = new Hono<{ Bindings: Env; Variables: { userId?: string; sessionId?: string } }>();

	app.use('*', logger());
	app.use(
		'*',
		cors({
			origin: '*',
			allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization'],
			credentials: true,
		}),
	);

	return app;
}


