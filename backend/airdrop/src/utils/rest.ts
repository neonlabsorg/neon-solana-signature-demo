import { log } from './log';

export function prepareHeaders(headersData: Record<string, string>): [Headers, string] {
  const headers: Headers = new Headers();
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  for (const key in headersData) {
    if (headersData.hasOwnProperty(key)) {
      headers.set(key, headersData[key]);
    }
  }
  const h: string[] = [];
  headers.forEach((value, key) => {
    h.push(`-H '${key}: ${value}'`);
  });
  return [headers, h.join(' ')];
}

export async function post<T = any>(url = '', data: Record<string, any> = {}, headersData: Record<string, string> = {}, method = 'POST'): Promise<T> {
  const [headers, headersString] = prepareHeaders(headersData);
  const body = JSON.stringify(data);
  const fetchData: RequestInit = {
    headers,
    body,
    method: method,
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  };
  log(`curl ${url} -X ${method} ${headersString} -d '${body}' | jq .`);
  const response = await fetch(url, fetchData);
  const result = await response.text();
  if (result) {
    return JSON.parse(result);
  }
  return {} as T;
}

export async function get<T = any>(url = '', params: Record<string, string> = {}, headersData: Record<string, string> = {}): Promise<T> {
  const [headers, headersString] = prepareHeaders(headersData);
  const fetchData: RequestInit = {
    headers,
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    redirect: 'follow',
    referrerPolicy: 'no-referrer'
  };
  log(`curl ${url} -X GET ${headersString} | jq .`);
  const response = await fetch(url, fetchData);
  const result = await response.text();
  if (result) {
    return JSON.parse(result);
  }
  return {} as T;
}
