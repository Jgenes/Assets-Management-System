const BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('mocu_ams_token');

  const headers = options.headers || {};
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData vs JSON
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body
  });

  if (response.status === 401) {
    // If token expired, clear and trigger event
    if (!endpoint.includes('/login')) {
      localStorage.removeItem('mocu_ams_token');
      localStorage.removeItem('mocu_ams_user');
      window.dispatchEvent(new Event('mocu:auth:expired'));
    }
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.message) ? data.message : `HTTP error ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          q.append(k, v);
        }
      });
      const queryStr = q.toString();
      if (queryStr) url += `?${queryStr}`;
    }
    return request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return request(endpoint, { method: 'PUT', body });
  },

  delete(endpoint) {
    return request(endpoint, { method: 'DELETE' });
  },

  upload(endpoint, formData) {
    return request(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};
