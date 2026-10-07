const sensitive = /cookie|authorization|token|password|passwd|secret|credential|signature|verify.?code|captcha|session.?id|access.?key|密码|验证码|登录凭证/i;
export function sanitizeURL(raw) {
 try {const u=new URL(raw); return {host:u.hostname,path:sanitizeText(u.pathname),query_keys:[...new Set([...u.searchParams.keys()].filter(k=>!sensitive.test(k)))]};} catch {return {host:'invalid',path:'[INVALID_URL]',query_keys:[]};}
}
export function sanitizeText(s) {
 return String(s).replace(/https?:\/\/[^\s"<>]+/gi, v=>{try {const u=new URL(v);return u.origin+u.pathname;}catch{return '[URL]';}})
 .replace(/\bBearer\s+[\w.\-+/=]+/gi,'[REDACTED]')
 .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g,'[REDACTED]')
 .replace(/((?:cookie|authorization|[\w-]*token|password|passwd|secret|signature|captcha|验证码|密码)\s*[=:：]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'[REDACTED]')
 .replace(/\b[a-f0-9]{32,}\b/gi,'[REDACTED]');
}
export function sanitize(value) {
 if(typeof value==='string')return sanitizeText(value);
 if(Array.isArray(value))return value.map(sanitize);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!sensitive.test(k)).map(([k,v])=>[sanitizeText(k),sanitize(v)]));
 return value;
}
