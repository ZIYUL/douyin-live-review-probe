export const commands=new Set(['Network.enable','Network.getResponseBody','Page.enable','Runtime.evaluate','Page.reload']);
export function send(target,method,params={}){if(!commands.has(method))throw Error('Unsupported command');return chrome.debugger.sendCommand(target,method,params);}
export async function attach(tabId){await chrome.debugger.attach({tabId},'1.3');try{await send({tabId},'Page.enable');await send({tabId},'Network.enable',{maxTotalBufferSize:80*1024*1024,maxResourceBufferSize:25*1024*1024});}catch(e){await chrome.debugger.detach({tabId});throw e;}}
export async function detach(tabId){await chrome.debugger.detach({tabId});}
