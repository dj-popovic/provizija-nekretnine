// ===========================
// PV.api — Fetch wrapper for backend API
// ===========================
window.PV = window.PV || {};

(function () {
  'use strict';

  var API_BASE = '';
  var TIMEOUT_MS = 15000;

  // --- Structured API error ---
  function ApiError(status, code, message, details) {
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN_ERROR';
    this.message = message || 'Došlo je do greške.';
    this.details = details || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function buildUrl(path, params) {
    var url = API_BASE + path;
    if (params) {
      var qs = new URLSearchParams();
      Object.keys(params).forEach(function (key) {
        var val = params[key];
        if (val !== undefined && val !== null && val !== '') {
          qs.set(key, val);
        }
      });
      var str = qs.toString();
      if (str) url += '?' + str;
    }
    return url;
  }

  async function request(method, path, options) {
    var params = options && options.params;
    var body = options && options.body;
    var url = method === 'GET' ? buildUrl(path, params) : buildUrl(path);

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    var fetchOptions = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    var res;
    try {
      res = await fetch(url, fetchOptions);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApiError(0, 'TIMEOUT', 'Zahtev je istekao. Pokušajte ponovo.');
      }
      throw new ApiError(0, 'NETWORK_ERROR', 'Nema internet konekcije.');
    }
    clearTimeout(timeoutId);

    var data;
    try {
      data = await res.json();
    } catch (e) {
      throw new ApiError(res.status, 'PARSE_ERROR', 'Neočekivan odgovor servera.');
    }

    if (!res.ok) {
      var err = data && data.error;
      throw new ApiError(
        res.status,
        err && err.code,
        err && err.message,
        err && err.details
      );
    }

    return data;
  }

  // --- Public API ---

  PV.api = {
    get: function (path, params) {
      return request('GET', path, { params: params });
    },

    post: function (path, body) {
      var payload = Object.assign({ website: '' }, body);
      return request('POST', path, { body: payload });
    },
  };

  PV.ApiError = ApiError;
})();
