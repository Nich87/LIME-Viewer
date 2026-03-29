interface Env {
	ASSETS: {
		fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
	};
}

const OBS_PROXY_PATH = '/api/obs/';
const OBS_REMOTE_BASE_URL = 'https://obs.line-apps.com/r/talk/emi/';

function badRequest(message: string, status = 400): Response {
	return new Response(message, {
		status,
		headers: {
			'Cache-Control': 'no-store'
		}
	});
}

async function handleObsProxy(request: Request): Promise<Response> {
	if (request.method !== 'GET') {
		return new Response('Method Not Allowed', {
			status: 405,
			headers: {
				Allow: 'GET',
				'Cache-Control': 'no-store'
			}
		});
	}

	const url = new URL(request.url);
	const objectId = decodeURIComponent(url.pathname.slice(OBS_PROXY_PATH.length)).trim();
	if (!objectId) return badRequest('Missing object id');

	const lineAccess = request.headers.get('X-Line-Access')?.trim();
	const talkMeta = request.headers.get('X-Talk-Meta')?.trim();
	if (!lineAccess || !talkMeta) {
		return badRequest('Missing OBS authentication headers');
	}

	const upstream = await fetch(`${OBS_REMOTE_BASE_URL}${encodeURIComponent(objectId)}`, {
		method: 'GET',
		headers: {
			'X-Line-Access': lineAccess,
			'X-Talk-Meta': talkMeta
		}
	});

	const headers = new Headers(upstream.headers);
	headers.set('Cache-Control', 'no-store');

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith(OBS_PROXY_PATH)) {
			return handleObsProxy(request);
		}

		return env.ASSETS.fetch(request);
	}
};
