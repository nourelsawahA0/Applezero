// AppleZero Service Worker
const CACHE_NAME = 'applezero-v1.0.0';
const API_CACHE_NAME = 'applezero-api-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/stats',
  '/api/bank-info'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('AppleZero SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('AppleZero SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('AppleZero SW: Skip waiting');
        self.skipWaiting();
      })
      .catch((error) => {
        console.error('AppleZero SW: Cache installation failed', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('AppleZero SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('AppleZero SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('AppleZero SW: Claiming clients');
        self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }
  
  // Handle static assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('AppleZero SW: Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response for caching
            const responseClone = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            // Serve offline fallback for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // Return a custom offline response
            return new Response(
              JSON.stringify({
                error: 'Network unavailable',
                message: 'You are currently offline. Please check your connection.'
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'application/json',
                }),
              }
            );
          });
      })
  );
});

// Handle API requests with cache-first strategy for specific endpoints
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isPublicEndpoint = API_ENDPOINTS.some(endpoint => 
    url.pathname.includes(endpoint)
  );
  
  if (isPublicEndpoint && request.method === 'GET') {
    try {
      // Try cache first for public endpoints
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Serve from cache and update in background
        fetchAndUpdateCache(request);
        return cachedResponse;
      }
      
      // Fetch and cache
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
      
    } catch (error) {
      // Try to serve from cache if network fails
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For authenticated endpoints, always go to network
  return fetch(request);
}

// Background fetch and cache update
async function fetchAndUpdateCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('AppleZero SW: Background update failed', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('AppleZero SW: Push received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AppleZero Update';
  const body = data.body || 'Your transfer request has been updated';
  const icon = '/icon-192.png';
  const badge = '/icon-192.png';
  
  const options = {
    body,
    icon,
    badge,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('AppleZero SW: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('AppleZero SW: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending offline actions here
  console.log('AppleZero SW: Performing background sync');
}
