import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:8000/hello', () => {
    return HttpResponse.json({
      status: 'ok',
      version: '0.1.0',
      message: 'Hello from Financiar backend!'
    });
  }),
];
