/**
 * Shared IntersectionObserver Service
 *
 * Replaces per-component IntersectionObserver instances with a single
 * shared observer, drastically reducing overhead when many image bubbles
 * are rendered simultaneously.
 */

type IntersectCallback = () => void;

let sharedObserver: IntersectionObserver | null = null;
const elementCallbacks = new Map<Element, IntersectCallback>();

function getSharedObserver(): IntersectionObserver {
	if (!sharedObserver) {
		sharedObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const callback = elementCallbacks.get(entry.target);
						if (callback) {
							// Once-only: unobserve after first intersection
							sharedObserver?.unobserve(entry.target);
							elementCallbacks.delete(entry.target);
							callback();
						}
					}
				}
				// Clean up observer if no elements are tracked
				if (elementCallbacks.size === 0 && sharedObserver) {
					sharedObserver.disconnect();
					sharedObserver = null;
				}
			},
			{ rootMargin: '300px 0px', threshold: 0.01 }
		);
	}
	return sharedObserver;
}

/**
 * Observe an element and invoke the callback once when it first intersects
 * with the viewport (plus 300px margin for preloading).
 * Returns a cleanup function that stops observation.
 */
export function observeOnce(element: Element, callback: IntersectCallback): () => void {
	if (typeof IntersectionObserver === 'undefined') {
		// Fallback: treat as immediately visible
		callback();
		return () => {};
	}

	elementCallbacks.set(element, callback);
	getSharedObserver().observe(element);

	return () => {
		elementCallbacks.delete(element);
		sharedObserver?.unobserve(element);
		if (elementCallbacks.size === 0 && sharedObserver) {
			sharedObserver.disconnect();
			sharedObserver = null;
		}
	};
}
