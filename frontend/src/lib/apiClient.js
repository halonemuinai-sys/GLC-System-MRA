import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:5005';

async function request(path, options = {}) {
  const { params, headers, ...restOptions } = options;

  // Build URL with query params if any
  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  // Get token from cookies
  const token = Cookies.get('glc_mra_token');

  // Set default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Fallback if response is not JSON
    }
    throw new Error(errorMessage);
  }

  // Return parsed JSON, handle empty responses
  if (response.status === 204) {
    return {};
  }
  return response.json();
}

export const apiClient = {
  get: (path, options) => 
    request(path, { ...options, method: 'GET' }),
    
  post: (path, body, options) => 
    request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
  put: (path, body, options) => 
    request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
  delete: (path, options) => 
    request(path, { ...options, method: 'DELETE' }),
};
