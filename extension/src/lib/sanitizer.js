import {safeQuery} from './query-policy.js';
const sensitive = /cookie|authorization|token|password|passwd|secret|credential|signature|verify.?code|captcha|session.?id|access.?key|密码|验证码|登录凭证/i;
export function sanitizeURL(raw,allowlist={}) {
 try {const u=new URL(raw); const result={host:u.hostname,path:sanitizeText(u.pathname),query_keys:[...new Set([...u.searchParams.keys()].filter(k=>!sensitive.test(k)))]};const context=safeQuery(u.searchParams,allowlist);if(Object.keys(context).length)result.safe_query=context;return result;} catch {return {host:'invalid',path:'[INVALID_URL]',query_keys:[]};}
}
export function sanitizeText(s) {
 return String(s).replace(/https?:\/\/[^\s"<>]+/gi, v=>{try {const u=new URL(v);return u.origin+u.pathname;}catch{return '[URL]';}})
 .replace(/\bBearer\s+[\w.\-+/=]+/gi,'[REDACTED]')
 .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g,'[REDACTED]')
 .replace(/((?:cookie|authorization|[\w-]*token|password|passwd|secret|signature|captcha|验证码|密码)\s*[=:：]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'[REDACTED]')
 .replace(/\b[a-f0-9]{32,}\b/gi,'[REDACTED]');
}
export function sanitize(value,layers=0) {
 if(typeof value==='string'){if(/^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/.test(value)){if(layers>=3)return '[NESTED_JSON_LIMIT]';try{return JSON.stringify(sanitize(JSON.parse(value),layers+1));}catch{}}return sanitizeText(value);}
 if(Array.isArray(value))return value.map(v=>sanitize(v,layers));
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!sensitive.test(k)).map(([k,v])=>[sanitizeText(k),sanitize(v,layers)]));
 return value;
}
